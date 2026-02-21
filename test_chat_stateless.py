
import requests
import json
import uuid

API_URL = "http://localhost:8001/api"

def test_stateless_chat():
    session_id = str(uuid.uuid4())
    print(f"Testing Chat Session: {session_id}")
    
    # 1. Send Message
    try:
        res = requests.post(f"{API_URL}/intake/chat", json={
            "session_id": session_id,
            "message": "Hi, I'm Bob from Austin TX"
        })
        
        if res.status_code == 200:
            print(f"Response: {res.json()['response']}")
        else:
            print(f"Error {res.status_code}: {res.text}")
            
    except Exception as e:
        print(f"Request Exception: {e}")

if __name__ == "__main__":
    test_stateless_chat()
