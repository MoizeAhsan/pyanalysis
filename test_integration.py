#!/usr/bin/env python3
"""
Integration test script for Python Code Analyzer
Tests the end-to-end functionality with a sample Python project
"""

import os
import sys
import tempfile
import shutil
import requests
import time
import subprocess
from pathlib import Path


def create_sample_project():
    """Create a sample Python project for testing"""
    temp_dir = tempfile.mkdtemp(prefix="test_python_project_")

    # Create main.py
    main_content = '''"""
Main module for the test application
"""

from utils import helper_function
from models import User, Product

class Application:
    """Main application class"""
    
    def __init__(self, name: str):
        self.name = name
        self.users = []
        self.products = []
    
    def add_user(self, user: User) -> None:
        """Add a user to the application"""
        self.users.append(user)
    
    def process_data(self):
        """Process application data"""
        return helper_function(self.users)

def main():
    """Main entry point"""
    app = Application("Test App")
    print(f"Starting {app.name}")

if __name__ == "__main__":
    main()
'''

    # Create utils.py
    utils_content = '''"""
Utility functions for the application
"""

from typing import List, Dict, Any

def helper_function(data: List[Any]) -> Dict[str, int]:
    """Helper function that processes data"""
    return {
        "count": len(data),
        "processed": True
    }

def format_output(data: Dict[str, Any]) -> str:
    """Format output for display"""
    return f"Data: {data}"
'''

    # Create models.py
    models_content = '''"""
Data models for the application
"""

from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    """User model"""
    id: int
    name: str
    email: str
    active: bool = True
    
    def get_display_name(self) -> str:
        """Get user display name"""
        return f"{self.name} ({self.email})"

@dataclass
class Product:
    """Product model"""
    id: int
    name: str
    price: float
    description: Optional[str] = None
    
    def get_formatted_price(self) -> str:
        """Get formatted price string"""
        return f"${self.price:.2f}"
'''

    # Write files
    with open(os.path.join(temp_dir, "main.py"), "w") as f:
        f.write(main_content)

    with open(os.path.join(temp_dir, "utils.py"), "w") as f:
        f.write(utils_content)

    with open(os.path.join(temp_dir, "models.py"), "w") as f:
        f.write(models_content)

    # Create a subdirectory with more files
    sub_dir = os.path.join(temp_dir, "services")
    os.makedirs(sub_dir)

    service_content = '''"""
Service layer for the application
"""

from models import User, Product

class UserService:
    """Service for managing users"""
    
    def __init__(self):
        self.users = []
    
    def create_user(self, name: str, email: str) -> User:
        """Create a new user"""
        user_id = len(self.users) + 1
        user = User(id=user_id, name=name, email=email)
        self.users.append(user)
        return user
    
    def get_user(self, user_id: int) -> User:
        """Get user by ID"""
        for user in self.users:
            if user.id == user_id:
                return user
        raise ValueError(f"User {user_id} not found")
'''

    with open(os.path.join(sub_dir, "user_service.py"), "w") as f:
        f.write(service_content)

    with open(os.path.join(sub_dir, "__init__.py"), "w") as f:
        f.write("# Services package\n")

    return temp_dir


def test_backend_api(project_path):
    """Test the backend API endpoints"""
    base_url = "http://localhost:8000/api"

    print("Testing backend API...")

    # Test root endpoint
    try:
        response = requests.get("http://localhost:8000/")
        print(f"✓ Root endpoint: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Backend not running. Please start with: cd backend && python main.py")
        return False

    # Test reset endpoint
    try:
        response = requests.post(f"{base_url}/reset")
        print(f"✓ Reset endpoint: {response.status_code}")
    except Exception as e:
        print(f"✗ Reset endpoint failed: {e}")
        return False

    # Test analyze endpoint
    try:
        response = requests.post(
            f"{base_url}/analyze", json={"project_path": project_path}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Analyze endpoint: {response.status_code}")
            print(f"  - Success: {data.get('success')}")
            print(f"  - Message: {data.get('message')}")
            if "data" in data:
                stats = data["data"]
                print(f"  - Files: {stats.get('total_files', 0)}")
                print(f"  - Classes: {stats.get('classes_count', 0)}")
                print(f"  - Functions: {stats.get('functions_count', 0)}")
        else:
            print(f"✗ Analyze endpoint failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Analyze endpoint failed: {e}")
        return False

    # Test data endpoint
    try:
        response = requests.get(f"{base_url}/data")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Data endpoint: {response.status_code}")
            print(f"  - Has data: {data.get('data', {}).get('has_data', False)}")
        else:
            print(f"✗ Data endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Data endpoint failed: {e}")
        return False

    return True


def check_frontend():
    """Check if frontend is accessible"""
    try:
        response = requests.get("http://localhost:3000")
        if response.status_code == 200:
            print("✓ Frontend is accessible at http://localhost:3000")
            return True
        else:
            print(f"✗ Frontend returned status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Frontend not running. Please start with: cd frontend && npm start")
        return False
    except Exception as e:
        print(f"✗ Frontend check failed: {e}")
        return False


def main():
    """Main test function"""
    print("Python Code Analyzer - Integration Test")
    print("=" * 50)

    # Create sample project
    print("\n1. Creating sample Python project...")
    project_path = create_sample_project()
    print(f"✓ Sample project created at: {project_path}")

    # List files in the project
    print("\nProject structure:")
    for root, dirs, files in os.walk(project_path):
        level = root.replace(project_path, "").count(os.sep)
        indent = " " * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = " " * 2 * (level + 1)
        for file in files:
            print(f"{subindent}{file}")

    # Test backend
    print("\n2. Testing backend API...")
    backend_ok = test_backend_api(project_path)

    # Test frontend
    print("\n3. Testing frontend accessibility...")
    frontend_ok = check_frontend()

    # Summary
    print("\n" + "=" * 50)
    print("Integration Test Summary:")
    print(f"✓ Sample project: Created")
    print(
        f"{'✓' if backend_ok else '✗'} Backend API: {'Working' if backend_ok else 'Failed'}"
    )
    print(
        f"{'✓' if frontend_ok else '✗'} Frontend: {'Accessible' if frontend_ok else 'Not accessible'}"
    )

    if backend_ok and frontend_ok:
        print("\n🎉 Integration test PASSED!")
        print(f"You can now test the full application by:")
        print(f"1. Opening http://localhost:3000 in your browser")
        print(f"2. Entering the project path: {project_path}")
        print(f"3. Clicking 'Analyze Project'")
    else:
        print("\n❌ Integration test FAILED!")
        print(
            "Please check the error messages above and ensure both backend and frontend are running."
        )

    # Cleanup
    print(f"\nCleaning up sample project: {project_path}")
    try:
        shutil.rmtree(project_path)
        print("✓ Cleanup completed")
    except Exception as e:
        print(f"✗ Cleanup failed: {e}")


if __name__ == "__main__":
    main()
