#!/usr/bin/env python
"""Development server startup script."""

import os
import sys
from pathlib import Path

# Add parent directory to path for module resolution
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    os.environ["PYTHON_ENV"] = "development"
    from src.main import start_server
    start_server()