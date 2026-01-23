import string
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
from ..services.azure_helpers import build_tenant_wide_user_dashboard, build_user_objects
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
 