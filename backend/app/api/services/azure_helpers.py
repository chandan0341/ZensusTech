import httpx
import asyncio
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

# --- HELPER: MANUAL TOKEN FETCH ---
async def get_graph_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
        "scope": "https://graph.microsoft.com/.default"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=data)
        if resp.status_code != 200:
            raise Exception(f"Graph Auth Failed: {resp.text}")
        return resp.json().get("access_token")

# --- HELPER: API CALLS ---
async def fetch_role_assignments(sub_id: str, token: str) -> List[Dict]:
    url = f"{ARM_BASE}/subscriptions/{sub_id}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        return resp.json().get("value", [])

async def fetch_user_details(user_id: str, token: str) -> Optional[Dict]:
    url = f"{GRAPH_BASE}/users/{user_id}?$select=displayName,userPrincipalName,id,accountEnabled"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 200:
            return resp.json()
        # Returns None for 404 (Not Found) or other errors
        return None

async def fetch_mfa_status(user_id: str, token: str) -> str:
    url = f"{BETA_BASE}/users/{user_id}/authentication/methods"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.status_code != 200: 
            return "Disabled"
        methods = resp.json().get("value", [])
        # Check if any method other than 'password' is registered
        mfa_exists = any(m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod" for m in methods)
        return "Enabled" if mfa_exists else "Disabled"

# --- CORE LOGIC ---
async def build_user_objects(subscription_id: str, mgmt_token: str, graph_token: str):
    print('--- Building user objects ---', flush=True)
    assignments = await fetch_role_assignments(subscription_id, mgmt_token)
    print(f'Fetched {len(assignments)} role assignments', flush=True)
    
    # Group by principalId to handle multiple roles per person
    grouped = {}
    for a in assignments:
        pid = a["properties"]["principalId"]
        role_guid = a["properties"]["roleDefinitionId"].split('/')[-1]
        role_name = AZURE_ROLES.get(role_guid, "Custom Role")
        p_type = a["properties"].get("principalType", "User")
        
        if pid not in grouped:
            grouped[pid] = {"roles": {role_name}, "principalType": p_type}
        else:
            grouped[pid]["roles"].add(role_name)

    async def process_user(pid, data):
        try:
            # Fetch details and MFA at the same time
            user_info, mfa = await asyncio.gather(
                fetch_user_details(pid, graph_token),
                fetch_mfa_status(pid, graph_token)
            )

            # --- SKIP LOGIC ---
            # If user_info is None (Graph returned 404), we skip this principal
            if not user_info:
                print(f"--- Skipping principal {pid}: Not found in Graph Users (Service Principal or Deleted) ---", flush=True)
                return None

            display_name = user_info.get("displayName", "Unknown")
            is_active = user_info.get("accountEnabled", True)
            status = "Active" if is_active else "Inactive"
            
            # Risk Logic
            risk = "High" if mfa == "Disabled" and status == "Inactive" else "Medium" if mfa == "Disabled" else "Low"

            return {
                "user": display_name,
                "role": ", ".join(sorted(list(data["roles"]))),
                "subscription": subscription_id,
                "mfa": mfa,
                "status": status,
                "risk": risk,
                "principalType": data["principalType"]
            }
        except Exception as e:
            # Ensures one bad user doesn't crash the entire list
            print(f"Error processing principal {pid}: {str(e)}", flush=True)
            return None

    # Start all tasks
    tasks = [process_user(pid, data) for pid, data in grouped.items()]
    results = await asyncio.gather(*tasks)
    
    # Filter out the 'None' values from skipped users
    final_results = [r for r in results if r]
    print(f'--- Finalized {len(final_results)} user objects ---', flush=True)
    return final_results
