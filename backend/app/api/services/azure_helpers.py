import asyncio
import httpx
import time
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# --- CONFIGURATION ---
router = APIRouter()
bearer_scheme = HTTPBearer()

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
BETA_BASE = "https://graph.microsoft.com/beta"
ARM_BASE = "https://management.azure.com"

# Universal Azure Role Mapping
AZURE_ROLES = {
    "8e3af657-a8ff-443c-a75c-2fe8c4bcb635": "Owner",
    "b24988ac-6180-42a0-ab88-20f7382dd24c": "Contributor",
    "acdd72a7-3385-48ef-bd42-f606fba81ae7": "Reader",
    "18d7d88d-d35e-4fb5-a5c3-7773c20a72d9": "User Access Administrator"
}

class UserRequest(BaseModel):
    subscription_id: str
    tenant_id: str
    client_id: str
    client_secret: str

async def fetch_role_assignments(client, sub_id, token):
    """Step 1: Fetch all role assignments from Azure ARM."""
    url = f"https://management.azure.com/subscriptions/{sub_id}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01"
    resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    return resp.json().get("value", []) if resp.status_code == 200 else []

async def execute_graph_batch(client, user_chunk, grouped_data, token):
    """Step 2: Build and execute a combined batch for 5 users (10 requests)."""
    batch_requests = []
    
    for pid in user_chunk:
        p_type = grouped_data[pid]["type"]
        
        # Request A: Profile Details (Always)
        batch_requests.append({
            "id": f"u_{pid}",
            "method": "GET",
            "url": f"/users/{pid}?$select=displayName,userPrincipalName,accountEnabled"
        })
        
        # Request B: MFA (Only for Users)
        if p_type == "User":
            batch_requests.append({
                "id": f"m_{pid}",
                "method": "GET",
                "url": f"/users/{pid}/authentication/methods"
            })

    # Fire the batch
    resp = await client.post(
        f"{GRAPH_BASE}/$batch",
        json={"requests": batch_requests},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    return {res["id"]: res for res in resp.json().get("responses", [])} if resp.status_code == 200 else {}

async def build_user_objects(subscription_id: str, mgmt_token: str, graph_token: str):
    """Main Orchestrator - Counting Total Assignments to highlight issues."""
    start_time = time.perf_counter()
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch Assignments (The JSON with duplicates)
        assignments = await fetch_role_assignments(client, subscription_id, mgmt_token)
        if not assignments:
            return {"users": [], "servicePrincipalsCount": 0, "foreignGroupsCount": 0}

        # 2. Counters for Total Assignments
        sp_count = 0
        fg_count = 0
        grouped = {}
        subscription_id = ""

        for a in assignments:
            p = a["properties"]
            pid = p["principalId"]
            p_type = p.get("principalType", "User")
            
            
            # UPDATED: Increment every time it appears in the JSON
            if p_type == "ForeignGroup":
                fg_count += 1
            elif p_type == "ServicePrincipal":
                sp_count += 1

            # Grouping logic for the Users Table
            role_id = p["roleDefinitionId"].split('/')[-1]
            role_name = AZURE_ROLES.get(role_id, "Custom Role")
            subscription_id = p["roleDefinitionId"].split('/')[2]
            
            if pid not in grouped:
                grouped[pid] = {"roles": {role_name}, "type": p_type}
            else:
                grouped[pid]["roles"].add(role_name)

        # 3. Batch Processing for 'User' types
        user_ids = [pid for pid, data in grouped.items() if data["type"] == "User"]
        final_user_results = []

        for i in range(0, len(user_ids), 5):
            chunk = user_ids[i:i + 5]
            batch_data = await execute_graph_batch(client, chunk, grouped, graph_token)

            for pid in chunk:
                u_res = batch_data.get(f"u_{pid}", {})
                m_res = batch_data.get(f"m_{pid}", {})

                if u_res.get("status") != 200:
                    continue

                u_body = u_res.get("body", {})
                is_active = u_body.get("accountEnabled", True)
                
                m_val = m_res.get("body", {}).get("value", []) if m_res.get("status") == 200 else []
                mfa_enabled = any(m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod" for m in m_val)
                
                final_user_results.append({
                    "user": u_body.get("displayName", "Unknown"),
                    "email": u_body.get("userPrincipalName", "N/A"),
                    "role": ", ".join(sorted(list(grouped[pid]["roles"]))),
                    "mfa": "Enabled" if mfa_enabled else "Disabled",
                    "status": "Active" if is_active else "Inactive",
                    "risk": "Low" if mfa_enabled else "High",
                    "principalType": grouped[pid]["type"],
                    "subscription": subscription_id
                })

    # RETURN THE RAW COUNTS
    return {
        "users": final_user_results,
        "servicePrincipalsCount": sp_count, # Total assignments
        "foreignGroupsCount": fg_count      # Total assignments (will be 2 for your example)
    }
    
async def fetch_graph_batch(client: httpx.AsyncClient, batch_requests: List[Dict], token: str) -> List[Dict]:
    url = f"{GRAPH_BASE}/$batch"
    payload = {"requests": batch_requests}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = await client.post(url, json=payload, headers=headers)
    return resp.json().get("responses", []) if resp.status_code == 200 else []

async def fetch_license_and_usage(access_token: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        # 1. Fetch SKUs (Your purchased licenses)
        sku_res = await client.get("https://graph.microsoft.com/v1.0/subscribedSkus", headers=headers)
        
        # 2. Fetch Usage (Activity report for last 90 days)
        usage_url = "https://graph.microsoft.com/v1.0/reports/getMicrosoft365AppUserDetail(period='D90')?$format=application/json"
        usage_res = await client.get(usage_url, headers=headers)
        
    skus = sku_res.json().get("value", []) if sku_res.status_code == 200 else []
    
    # Check if we have permission for reports (Reports.Read.All)
    usage_ok = usage_res.status_code == 200
    usage_data = usage_res.json().get("value", []) if usage_ok else None
    
    return skus, usage_data, usage_ok

async def get_secure_score(token: str):
    """Fetches the overall Microsoft Secure Score (Available in all tiers)."""
    headers = {"Authorization": f"Bearer {token}"}
    # This endpoint provides the 67/100 style score
    url = "https://graph.microsoft.com/v1.0/security/secureScores?$top=1"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json().get("value", [])
            if data:
                # Calculate percentage: (current / max) * 100
                current = data[0].get("currentScore", 0)
                max_score = data[0].get("maxScore", 1)
                return round((current / max_score) * 100)
        return 0
    
async def fetch_email_security_status(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    # Filter for unresolved Email category alerts
    url = "https://graph.microsoft.com/v1.0/security/alerts?$filter=category eq 'Email' and status eq 'newActive'&$top=5"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                alerts = response.json().get("value", [])
                
                if not alerts:
                    return {"status": "Good", "color": "green"}
                
                # Check if any alert is 'High' severity
                has_high_risk = any(a.get("severity") == "high" for a in alerts)
                if has_high_risk:
                    return {"status": "High Risk", "color": "red"}
                
                return {"status": "Needs Improvement", "color": "orange"}
            return {"status": "Good", "color": "green"}
        except Exception:
            return {"status": "Good", "color": "green"}    

async def build_tenant_wide_user_dashboard(graph_token: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            headers = {"Authorization": f"Bearer {graph_token}"}
            all_users = []
            
            # 1. FETCH ALL USERS
            user_url = f"{GRAPH_BASE}/users?$select=displayName,userPrincipalName,id,userType,accountEnabled&$top=999"
            while user_url:
                u_resp = await client.get(user_url, headers=headers)
                u_data = u_resp.json()
                users_chunk = u_data.get("value", [])
                all_users.extend(users_chunk)
                user_url = u_data.get("@odata.nextLink")

            print(f"DEBUG: Found {len(all_users)} total users in tenant.")

            if not all_users:
                return []

            final_report = []
            
            # 2. BATCH MEMBER_OF & MFA (10 Users at a time)
            for i in range(0, len(all_users), 10):
                chunk = all_users[i:i + 10]
                batch_requests = []

                for u in chunk:
                    uid = u['id']
                    batch_requests.append({
                        "id": f"roles-{uid}",
                        "method": "GET",
                        "url": f"/users/{uid}/memberOf?$select=displayName"
                    })
                    batch_requests.append({
                        "id": f"mfa-{uid}",
                        "method": "GET",
                        "url": f"/users/{uid}/authentication/methods"
                    })

                responses = await fetch_graph_batch(client, batch_requests, graph_token)
                # Ensure body is not None and handles error status codes per request
                batch_map = {
                    res["id"]: res.get("body", {}) 
                    for res in responses 
                    if res.get("status") == 200 and res.get("body")
                }

                # 3. JOIN DATA
                for u in chunk:
                    uid = u['id']
                    
                    # --- FIXED ROLES LOGIC ---
                    member_of_data = batch_map.get(f"roles-{uid}", {}).get("value", [])
                    
                    # Ensure we only take items that have a valid 'displayName' string
                    priv_roles_list = [
                        item.get("displayName") 
                        for item in member_of_data 
                        if item.get("@odata.type") == "#microsoft.graph.directoryRole" 
                        and item.get("displayName") is not None
                    ]
                    
                    roles_string = ", ".join(priv_roles_list) if priv_roles_list else "Standard User"
                    
                    # --- MFA LOGIC ---
                    mfa_data = batch_map.get(f"mfa-{uid}", {}).get("value", [])
                    mfa_enabled = any(
                        m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod" 
                        for m in mfa_data
                    )
                    
                    account_enabled = u.get("accountEnabled", True)
                    status = "Active" if account_enabled else "Inactive"
                    mfa_text = "Enabled" if mfa_enabled else "Disabled"

                    # --- RISK LOGIC (MFA & Status Only) ---
                    risk = "Low"
                    if not mfa_enabled:
                        risk = "High" if not account_enabled else "Medium"

                    final_report.append({
                        "user": uid,
                        "user": u.get("displayName") or "Unknown",
                        "email": u.get("userPrincipalName") or "N/A",
                        "status": status,
                        "mfa": mfa_text,
                        "role": roles_string,
                        "risk": risk,
                        "principalType": u.get("userType", "User")
                    })

            print(f"DEBUG: Successfully processed {len(final_report)} user objects.")
            return final_report

        except Exception as e:
            # This captures the exact line and error to help debug
            import traceback
            print(f"ERROR: {str(e)}")
            traceback.print_exc()
            return []



async def fetch_identity_governance_data(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    # We select specific fields to keep the response light
    url = "https://graph.microsoft.com/v1.0/users?$select=id,displayName,userType,signInActivity,assignedLicenses"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            return None
        
        users = response.json().get("value", [])
        
        # Threshold for Inactive Users (30 days ago)
        threshold_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        # Initialize counters
        total_users = len(users)
        guest_users = 0
        inactive_users = 0
        
        for user in users:
            # 1. Count Guests
            if user.get("userType") == "Guest":
                guest_users += 1
            
            # 2. Count Inactive (No login in 30 days)
            # Note: signInActivity requires AuditLog.Read.All permission
            activity = user.get("signInActivity")
            if activity:
                last_login_str = activity.get("lastSignInDateTime")
                if last_login_str:
                    last_login = datetime.fromisoformat(last_login_str.replace("Z", "+00:00"))
                    if last_login < threshold_date:
                        inactive_users += 1
            else:
                # If no activity record exists, they are likely inactive
                inactive_users += 1

        return {
            "total": total_users,
            "guests": guest_users,
            "inactive": inactive_users,
            "active": total_users - inactive_users
        }

async def fetch_privileged_user_count(token: str):
    """Counts users with Directory Roles (Global Admin, etc.)"""
    headers = {"Authorization": f"Bearer {token}"}
    # This endpoint gets all directory roles that have members assigned
    url = "https://graph.microsoft.com/v1.0/directoryRoles?$expand=members"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        roles = response.json().get("value", [])
        
        # Use a set to count unique users across different roles
        privileged_user_ids = set()
        for role in roles:
            for member in role.get("members", []):
                privileged_user_ids.add(member.get("id"))
                
        return len(privileged_user_ids)        