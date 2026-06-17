import requests
import time

BASE_URL = "http://127.0.0.1:5000"
USER_ID = "0cd632b1-e7d1-4237-9068-7abcb6f99af2"

def enqueue_ingestion():
    payload = {"userId": USER_ID}
    try:
        r = requests.post(f"{BASE_URL}/api/ingest", json=payload, timeout=5)
        if r.status_code == 200:
            data = r.json()
            job_id = data.get("jobId")
            print(f"✅ Job enqueued with ID: {job_id}")
            return job_id
        else:
            print(f"❌ Failed: {r.status_code} - {r.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def poll_status(job_id):
    url = f"{BASE_URL}/api/ingest/status/{job_id}"
    for _ in range(10):  # max 30 seconds
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                data = r.json()
                print(f"Status: {data.get('status')}")
                if data.get('status') == 'completed':
                    print(f"✅ Result: {data.get('result')}")
                    return
                elif data.get('status') == 'failed':
                    print(f"❌ Error: {data.get('error')}")
                    return
            elif r.status_code == 404:
                print("⚠️ Status endpoint not available. Check worker logs manually.")
                return
        except:
            pass
        time.sleep(3)
    print("⏰ Timeout – check worker logs.")

if __name__ == "__main__":
    job_id = enqueue_ingestion()
    if job_id:
        poll_status(job_id)