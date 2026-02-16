
import requests
import json

API_URL = "http://localhost:8001/api"

def test_flow():
    # 1. Register
    email = f"test_pro_{str(uuid.uuid4())[:8]}@example.com"
    password = "password123"
    print(f"Registering {email}...")
    
    reg_res = requests.post(f"{API_URL}/auth/register", json={
        "company_name": "Pro Builder Inc",
        "email": email,
        "password": password
    })
    
    if reg_res.status_code != 200:
        print(f"Registration failed: {reg_res.text}")
        return
        
    token = reg_res.json()["token"]
    print("Registered & Logged in.")
    
    # 2. Create Checkout Session
    print("Creating checkout session...")
    checkout_res = requests.post(
        f"{API_URL}/payments/checkout", 
        json={"plan_id": "pro_monthly", "origin_url": "http://localhost:3000"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if checkout_res.status_code == 200:
        data = checkout_res.json()
        print(f"Success! Checkout URL: {data['url']}")
        if "checkout.stripe.com" in data['url'] or "stripe.com" in data['url']:
             print("URL looks valid.")
        else:
             print("Warning: URL format unexpected.")
    else:
        print(f"Checkout creation failed: {checkout_res.text}")

import uuid
if __name__ == "__main__":
    test_flow()
