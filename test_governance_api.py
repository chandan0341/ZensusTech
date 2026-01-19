import requests
import json

# Test the governance endpoints
BASE_URL = "http://localhost:8000/api/v1"

test_payload = {
    "clientId": "test-client",
    "clientSecret": "test-secret",
    "tenantId": "tenant-1",
    "subscriptionId": "sub-1"
}

endpoints = [
    "/governance/stats",
    "/governance/risk-distribution",
    "/governance/users/drilldown",
    "/governance/user-activity-trend"
]

for endpoint in endpoints:
    url = f"{BASE_URL}{endpoint}"
    print(f"\nTesting: {url}")
    try:
        response = requests.post(url, json=test_payload)
        print(f"Status: {response.status_code}")
        if response.ok:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection Error: {e}")
