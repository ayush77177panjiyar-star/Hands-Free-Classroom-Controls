import os
import sys

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app

def test_endpoints():
    print("Testing FastAPI endpoints directly...")
    try:
        from starlette.testclient import TestClient
        client = TestClient(app)
        
        # Test 1: Root endpoint
        root_res = client.get("/")
        print(f"GET / -> status {root_res.status_code}, response: {root_res.json()}")
        assert root_res.status_code == 200
        
        # Test 2: Health endpoint
        health_res = client.get("/api/v1/health")
        print(f"GET /api/v1/health -> status {health_res.status_code}, response: {health_res.json()}")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "healthy"

        # Test 3: Status endpoint
        status_res = client.get("/api/v1/status")
        print(f"GET /api/v1/status -> status {status_res.status_code}, status: {status_res.json()['status']}")
        assert status_res.status_code == 200

        # Test 4: Calibration GET
        cal_res = client.get("/api/v1/calibration")
        print(f"GET /api/v1/calibration -> status {cal_res.status_code}")
        assert cal_res.status_code == 200
        assert cal_res.json()["success"] is True

        # Test 5: Analytics overview
        analytics_res = client.get("/api/v1/analytics/overview")
        print(f"GET /api/v1/analytics/overview -> status {analytics_res.status_code}")
        assert analytics_res.status_code == 200
        assert analytics_res.json()["data"]["is_demo_preview"] is True

        # Test 6: Comparative benchmark
        comp_res = client.get("/api/v1/analytics/comparison")
        print(f"GET /api/v1/analytics/comparison -> status {comp_res.status_code}")
        assert comp_res.status_code == 200

        # Test 7: Sessions list
        sess_res = client.get("/api/v1/sessions")
        print(f"GET /api/v1/sessions -> status {sess_res.status_code}")
        assert sess_res.status_code == 200

        print("\n ALL FASTAPI ENDPOINTS PASSED VERIFICATION SUCCESSFULLY!")
    except Exception as e:
        print(f"Error testing endpoints: {e}")
        raise e

if __name__ == "__main__":
    success = test_endpoints()
    if not success:
        sys.exit(1)
