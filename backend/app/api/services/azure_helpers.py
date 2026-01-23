import asyncio
import httpx
import time
import sys
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
    """Main Orchestrator."""
    start_time = time.perf_counter()
    print(f'--- Using Management Token: {mgmt_token}... ---', flush=True)    
    print(f'--- Using Graph Token: {graph_token}... ---', flush=True)
    print(f'subscription_id: {subscription_id}', flush=True)
    print('--- Starting Modular Execution ---', flush=True)
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch Assignments
        assignments = await fetch_role_assignments(client, subscription_id, mgmt_token)
        if not assignments:
            return []

        # 2. Process/Group Data
        grouped = {}
        for a in assignments:
            p = a["properties"]
            pid = p["principalId"]
            role_name = AZURE_ROLES.get(p["roleDefinitionId"].split('/')[-1], "Custom Role")
            p_type = p.get("principalType", "User")
            
            if pid not in grouped:
                grouped[pid] = {"roles": {role_name}, "type": p_type}
            else:
                grouped[pid]["roles"].add(role_name)

        user_ids = list(grouped.keys())
        final_results = []

        # 3. Batch Processing in chunks of 5
        for i in range(0, len(user_ids), 5):
            chunk = user_ids[i:i + 5]
            batch_data = await execute_graph_batch(client, chunk, grouped, graph_token)

            # 4. Data Assembly
            for pid in chunk:
                u_res = batch_data.get(f"u_{pid}", {})
                m_res = batch_data.get(f"m_{pid}", {})

                if u_res.get("status") != 200:
                    continue

                u_body = u_res.get("body", {})
                is_active = u_body.get("accountEnabled", True)
                p_type = grouped[pid]["type"]

                mfa_status, risk = "N/A", "Low"

                if p_type == "User":
                    m_val = m_res.get("body", {}).get("value", []) if m_res.get("status") == 200 else []
                    mfa_enabled = any(m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod" for m in m_val)
                    mfa_status = "Enabled" if mfa_enabled else "Disabled"
                    risk = "Low" if mfa_enabled else ("High" if not is_active else "Medium")

                final_results.append({
                    "user": u_body.get("displayName", "Unknown"),
                    "email": u_body.get("userPrincipalName", "N/A"),
                    "role": ", ".join(sorted(list(grouped[pid]["roles"]))),
                    "mfa": mfa_status,
                    "status": "Active" if is_active else "Inactive",
                    "risk": risk,
                    "principalType": p_type
                })

    print(f"--- Completed in {time.perf_counter() - start_time:.2f}s ---", flush=True)
    return final_results
async def fetch_graph_batch(client: httpx.AsyncClient, batch_requests: List[Dict], token: str) -> List[Dict]:
    url = f"{GRAPH_BASE}/$batch"
    payload = {"requests": batch_requests}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = await client.post(url, json=payload, headers=headers)
    return resp.json().get("responses", []) if resp.status_code == 200 else []

async def build_tenant_wide_user_dashboard(graph_token: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            headers = {"Authorization": f"Bearer {graph_token}"}
            all_users = []
            
            # 1. FETCH ALL USERS
            user_url = f"{GRAPH_BASE}/users?$select=displayName,userPrincipalName,id,accountEnabled&$top=999"
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
                        "risk": risk
                    })

            print(f"DEBUG: Successfully processed {len(final_report)} user objects.")
            return final_report

        except Exception as e:
            # This captures the exact line and error to help debug
            import traceback
            print(f"ERROR: {str(e)}")
            traceback.print_exc()
            return []