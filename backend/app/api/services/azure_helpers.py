import httpx
from typing import List, Dict
import asyncio
from ..routes.governance import User 

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
BETA_BASE = "https://graph.microsoft.com/beta"

async def fetch_users(token: str) -> List[Dict]:
    async with httpx.AsyncClient() as client:
        # We select userType (standard) and accountEnabled (for status)
        resp = await client.get(
            f"{GRAPH_BASE}/users?$select=displayName,userPrincipalName,id,userType,accountEnabled",
            headers={"Authorization": f"Bearer {token}"}
        )
        resp.raise_for_status()
        
        raw_data = resp.json().get("value", [])
        
        formatted_data = [
            {
                "id": u.get("id"),
                "displayName": u.get("displayName") or "Unknown User",
                "userPrincipalName": u.get("userPrincipalName"),
                # FIX 1: Provide a default string if userType is None to satisfy Pydantic
                "role": u.get("userType") or "Member",
                "accountEnabled": u.get("accountEnabled", True)
            }
            for u in raw_data
        ]
        return formatted_data

async def fetch_mfa_status(user_id: str, token: str) -> str:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BETA_BASE}/users/{user_id}/authentication/methods",
                headers={"Authorization": f"Bearer {token}"}
            )
            # If a user has no methods, Graph might 404/403 depending on permissions
            if resp.status_code != 200:
                return "Disabled"

            methods = resp.json().get("value", [])
            mfa_methods = [
                m for m in methods 
                if m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod"
            ]
            return "Enabled" if len(mfa_methods) > 0 else "Disabled"
    except Exception:
        return "Disabled"

async def build_user_objects(token: str) -> List[User]:
    users = await fetch_users(token)
    mfa_tasks = [fetch_mfa_status(u["id"], token) for u in users]
    mfa_results = await asyncio.gather(*mfa_tasks)

    user_objs = []
    for u, mfa_status in zip(users, mfa_results):
        # Determine Status string first
        current_status = "Active" if u["accountEnabled"] else "Inactive"
        
        # Risk Logic Implementation
        if mfa_status == "Disabled" and current_status == "Inactive":
            risk_level = "High"
        elif mfa_status == "Disabled" and current_status == "Active":
            risk_level = "Medium"
        elif mfa_status == "Enabled" and current_status == "Active":
            risk_level = "Low"
        else:
            risk_level = "Medium" # Default fallback

        user_objs.append(User(
            user=u["displayName"],
            role=u["role"],
            subscription="Prod-ERP",
            mfa=mfa_status,
            lastLogin="N/A",
            status=current_status,
            risk=risk_level
        ))
        
    return user_objs