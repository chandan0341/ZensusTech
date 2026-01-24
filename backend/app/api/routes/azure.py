import string
import token
from typing import List
from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
import requests
import logging
import httpx
import sys
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
import sys
from ..services.azure_helpers import build_tenant_wide_user_dashboard, build_user_objects, fetch_license_and_usage
from .governance import  User

router = APIRouter(tags=["azure"])
bearer_scheme = HTTPBearer()

class TokenRequest(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str
    scope: str

class SubscriptionRequest(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str

class UserRequest(BaseModel):
    subscription_id: str
    tenant_id: str
    client_id: str
    client_secret: str

@router.post("/azure/token")
def get_token(req: TokenRequest):
    url = f"https://login.microsoftonline.com/{req.tenant_id}/oauth2/v2.0/token"
    payload = {
        "client_id": req.client_id,
        "scope": req.scope,
        "client_secret": req.client_secret,
        "grant_type": "client_credentials"
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(url, data=payload, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=response.json())
    return response.json()

async def get_graph_token(tenant_id: str, client_id: str, client_secret: str,scope: str) -> str:
    """Manual HTTP call to get a Graph Token without using the Azure SDK."""
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
        "scope": scope
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=data)
        if resp.status_code != 200:
            raise Exception(f"Failed to get Graph token: {resp.text}")
        return resp.json().get("access_token")


@router.get("/azure/subscriptions")
def get_subscriptions(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    print('--- /azure/subscriptions endpoint called ---', flush=True)
    url = "https://management.azure.com/subscriptions?api-version=2020-01-01"
    headers = {"Authorization": f"{credentials.scheme} {credentials.credentials}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=response.json())
    return response.json()

@router.post("/azure/users")
async def get_users_info(
    request_data: UserRequest
):
    try:       
        # 2. Get a fresh Graph Token
        graph_token = await get_graph_token(
            request_data.tenant_id, 
            request_data.client_id, 
            request_data.client_secret,
            "https://graph.microsoft.com/.default"
        )

        mgmt_token = await get_graph_token(
                request_data.tenant_id, 
                request_data.client_id, 
                request_data.client_secret,
                "https://management.azure.com/.default"
            )
        print(f'--- Using Management Token: {mgmt_token}... ---', flush=True)    
        print(f'--- Using Graph Token: {graph_token}... ---', flush=True)
        print(f'subscription_id: {request_data.subscription_id}', flush=True)

        # 3. Build and return
        return await build_user_objects(request_data.subscription_id, mgmt_token, graph_token)
    
    except Exception as e:
        print(f"Critical Route Error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to sync Azure users")

@router.post("/azure/tenant/users")
async def get_tenant_users_info(
    request_data: SubscriptionRequest
):
    try:        
        # 2. Get a fresh Graph Token
        graph_token = await get_graph_token(
            request_data.tenant_id, 
            request_data.client_id, 
            request_data.client_secret,
            "https://graph.microsoft.com/.default"
        )

        # 3. Build and return
        return await build_tenant_wide_user_dashboard(graph_token)
    
    except Exception as e:
        print(f"Critical Route Error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to sync Azure users")   

PRICE_MAP = {
    "O365_BUSINESS_PREMIUM": 22.00,
    "ENTERPRISEPACK": 23.00,  # O365 E3
    "DEVELOPER_PACK": 0.00,
    "EXCHANGEONLINEPLAN1": 4.00
}

@router.post("/microsoft0365/license_and_usage_optimization")
async def get_license_and_usage_details(request_data: SubscriptionRequest):
    graph_token = await get_graph_token(
            request_data.tenant_id, 
            request_data.client_id, 
            request_data.client_secret,
            "https://graph.microsoft.com/.default"
        ) # Your existing token logic
    skus, usage_data, usage_ok = await fetch_license_and_usage(graph_token)

    report = []

    # Calculate Inactive globally if usage data is available
    # A user is "Inactive" if lastActivityDate is null/empty
    if usage_ok and usage_data:
        inactive_users = [u for u in usage_data if not u.get("lastActivityDate")]
        total_inactive_count = len(inactive_users)
    else:
        total_inactive_count = 0

    for item in skus:
        sku_name = item.get("skuPartNumber")
        purchased = item.get("prepaidUnits", {}).get("enabled", 0)
        assigned = item.get("consumedUnits", 0)
        
        # --- CALCULATION LOGIC ---
        unused = purchased - assigned
        
        if not usage_ok:
            # If no permission, show "N/A" and "-"
            inactive_display = "N/A"
            savings_display = "-"
        else:
            # For this specific license, we estimate the inactive portion
            # based on the ratio of global inactivity
            share_of_inactivity = int((assigned / len(usage_data)) * total_inactive_count) if usage_data else 0
            
            unit_price = PRICE_MAP.get(sku_name, 0.0)
            # Savings = (Unused Licenses + Inactive Assigned Licenses) * Price
            total_savings = (unused + share_of_inactivity) * unit_price
            
            inactive_display = share_of_inactivity
            savings_display = f"${total_savings:,.2f}"

        report.append({
            "license": sku_name.replace("_", " "),
            "purchased": purchased,
            "assigned": assigned,
            "unused": unused,
            "inactive": inactive_display,
            "potentialSavings": savings_display
        })
        
    return report