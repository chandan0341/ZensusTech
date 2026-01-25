# Azure Services

This package contains services for interacting with Azure and Microsoft Graph APIs.

## Services

### `auth_service.py`
- **AzureAuthService**: Handles Azure authentication and token management
  - `get_access_token()`: Get access token for any scope
  - `get_graph_token()`: Get Microsoft Graph API token
  - `get_management_token()`: Get Azure Management API token

### `subscription_service.py`
- **SubscriptionService**: Manages Azure subscription operations
  - `get_subscriptions()`: Get all subscriptions
  - `get_subscription_metadata()`: Get subscription metadata

### `graph_service.py`
- **GraphService**: Microsoft Graph API operations
  - `get_users()`: Get all users from tenant
  - `get_user_mfa_status()`: Check MFA status for a user
  - `get_user_roles()`: Get directory roles for a user
  - `get_identity_governance_data()`: Get governance statistics
  - `get_privileged_user_count()`: Count privileged users
  - `get_secure_score()`: Get Microsoft Secure Score
  - `get_email_security_status()`: Get email security status
  - `get_license_and_usage()`: Get license SKUs and usage data

### `user_service.py`
- **UserService**: User and role assignment operations
  - `get_subscription_users()`: Get users with role assignments for a subscription
  - `get_tenant_users()`: Get all users from tenant with roles and MFA

### `license_service.py`
- **LicenseService**: Microsoft 365 license management
  - `get_license_usage_details()`: Get license usage and optimization details
  - `get_identity_governance_report()`: Get identity governance report

## Usage

```python
from app.services.azure.auth_service import AzureAuthService
from app.services.azure.user_service import UserService

# Get tokens
graph_token = await AzureAuthService.get_graph_token(
    tenant_id="...",
    client_id="...",
    client_secret="..."
)

# Use services
user_service = UserService(graph_token=graph_token, management_token=mgmt_token)
users = await user_service.get_subscription_users(subscription_id)
```
