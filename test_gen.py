
import requests
import json

API_URL = "http://localhost:8001/api"

def test_gen():
    print("Testing Generation...")
    try:
        res = requests.post(f"{API_URL}/content/generate-message", json={
            "recipient_name": "Bob",
            "topic": "Quote follow up",
            "key_points": ["Did you see the price?", "We can start Monday"],
            "tone": "casual",
            "type": "email"
        })
        
        if res.status_code == 200:
            print(json.dumps(res.json(), indent=2))
        else:
            print(f"Error: {res.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_gen()
