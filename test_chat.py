
import requests
import json
import uuid

API_URL = "http://localhost:8001/api"

def test_chat_intake():
    session_id = str(uuid.uuid4())
    print(f"Starting chat session: {session_id}")
    
    # 1. Start Chat
    msg1 = "Hi, I want to build a house."
    res1 = requests.post(f"{API_URL}/intake/chat", json={"session_id": session_id, "message": msg1})
    print(f"User: {msg1}")
    print(f"AI: {res1.json()['response']}")
    
    # 2. Simulate complete flow (shortcut: sending 'COMPLETE:' trigger won't work from user side, 
    # but let's just verify the endpoint responds and stores history)
    
    # Verify parsing logic (mocking the AI response internally would be needed for full integration test)
    # But we can check if data is stored
    
    print("\nTest Complete.")

if __name__ == "__main__":
    test_chat_intake()
