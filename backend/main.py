import os
import sys

# Ensure both backend root and repo root are in sys.path so 'backend.app...' and 'app...' both resolve
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from backend.app.main import app

# Export app for FastAPI serverless / service runtime
__all__ = ["app"]
