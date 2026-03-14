#!/usr/bin/env python3
import requests
import time

# Test various endpoints to understand what's actually running
base_url = "http://187.124.66.30:8001"

def test_endpoint(path, method='GET'):
    try:
        if method == 'GET':
            resp = requests.get(f"{base_url}{path}", timeout=5)
        else:
            resp = requests.post(f"{base_url}{path}", timeout=5)
        return resp.status_code, resp.text[:200] if resp.text else ""
    except Exception as e:
        return 'ERROR', str(e)

print("Testing various endpoints:")
endpoints = [
    "/api/health",
    "/api/debug/env", 
    "/api/takeoff/analyze",
    "/takeoff/analyze",
    "/api/contractors",
    "/api/stats"
]

for endpoint in endpoints:
    status, text = test_endpoint(endpoint, 'POST' if 'analyze' in endpoint else 'GET')
    print(f"{endpoint}: {status} - {text[:100]}")