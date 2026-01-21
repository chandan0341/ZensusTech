from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import requests
import logging
import sys
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
import sys
from ..services.azure_helpers import build_user_objects
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


@router.get("/azure/subscriptions")
def get_subscriptions(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    print('--- /azure/subscriptions endpoint called ---', flush=True)
    url = "https://management.azure.com/subscriptions?api-version=2020-01-01"
    headers = {"Authorization": f"{credentials.scheme} {credentials.credentials}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=response.json())
    return response.json()

@router.get("/azure/users")
async def get_users_info(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    print('--- /azure/users endpoint called ---', file=sys.stdout, flush=True)
    print(f"Authorization header: {credentials.scheme} {credentials.credentials}", file=sys.stdout, flush=True)

    token = credentials.credentials
    users = await build_user_objects(token)
    return users