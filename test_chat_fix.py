
import requests
import json
import uuid

API_URL = "http://localhost:8001/api"

def test_chat_intake():
    session_id = str(uuid.uuid4())
    print(f"Starting chat session: {session_id}")
    
    # 1. Start Chat
    msg1 = "My name is Alice"
    res1 = requests.post(f"{API_URL}/intake/chat", json={"session_id": session_id, "message": msg1})
    
    if res1.status_code == 200:
        print(f"User: {msg1}")
        print(f"AI: {res1.json()['response']}")
    else:
        print(f"Chat failed: {res1.text}")

if __name__ == "__main__":
    test_chat_intake()
