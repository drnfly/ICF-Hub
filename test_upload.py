
import requests
import json
import uuid

API_URL = "http://localhost:8001/api"

def test_upload():
    print("Testing File Upload...")
    
    # Create a dummy file
    with open("test_blueprint.txt", "w") as f:
        f.write("This is a test blueprint file content.")
        
    session_id = str(uuid.uuid4())
    
    with open("test_blueprint.txt", "rb") as f:
        files = {'file': ('test_blueprint.txt', f, 'text/plain')}
        res = requests.post(
            f"{API_URL}/intake/upload", 
            files=files,
            data={'session_id': session_id}
        )
    
    if res.status_code == 200:
        data = res.json()
        print(f"Success! File URL: {data['url']}")
        print(f"Email Notification Sent: {data['email_sent']}")
    else:
        print(f"Upload failed: {res.text}")

if __name__ == "__main__":
    test_upload()
