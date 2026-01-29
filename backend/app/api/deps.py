from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_mgmt_token(auth: HTTPAuthorizationCredentials = Security(security)) -> str:
    # This automatically looks for "Authorization: Bearer <token>"
    if not auth:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    return auth.credentials

# Note: If you need BOTH tokens for one request, you might pass the 
# second one in a custom header like 'X-Graph-Token'
async def get_graph_token(request: Request) -> str:
    token = request.headers.get("X-Graph-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing X-Graph-Token Header")
    return token