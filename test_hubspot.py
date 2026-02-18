
import requests
import json

API_URL = "http://localhost:8001/api"

def test_hubspot_auth_url():
    print("Testing Auth URL Generation...")
    res = requests.get(f"{API_URL}/auth/hubspot/authorize?user_id=test_user_123")
    
    if res.status_code == 200:
        url = res.json()['url']
        print(f"Auth URL: {url}")
        if "client_id=a4e90530" in url:
            print("Verified: Client ID present.")
        else:
            print("Error: Client ID missing or incorrect.")
    else:
        print(f"Error: {res.text}")

if __name__ == "__main__":
    test_hubspot_auth_url()
