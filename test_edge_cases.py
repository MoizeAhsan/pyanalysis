#!/usr/bin/env python3
"""
Edge case testing for Python Code Analyzer integration
"""

import requests
import tempfile
import os


def test_empty_project():
    """Test with an empty directory"""
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Testing empty directory: {temp_dir}")

        response = requests.post(
            "http://localhost:8000/api/analyze", json={"project_path": temp_dir}
        )

        print(f"Empty directory result: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data['success']}")
            print(f"  Files found: {data['data']['total_files']}")
        else:
            print(f"  Error: {response.json()}")


def test_project_with_syntax_errors():
    """Test with Python files that have syntax errors"""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a file with syntax error
        bad_file = os.path.join(temp_dir, "bad_syntax.py")
        with open(bad_file, "w") as f:
            f.write(
                "def broken_function(\n    # Missing closing parenthesis\n    pass\n"
            )

        # Create a good file
        good_file = os.path.join(temp_dir, "good_file.py")
        with open(good_file, "w") as f:
            f.write("def good_function():\n    return 'Hello World'\n")

        print(f"Testing project with syntax errors: {temp_dir}")

        response = requests.post(
            "http://localhost:8000/api/analyze", json={"project_path": temp_dir}
        )

        print(f"Syntax error project result: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data['success']}")
            print(f"  Files found: {data['data']['total_files']}")
            print(f"  Functions found: {data['data']['functions_count']}")
        else:
            print(f"  Error: {response.json()}")


def test_reset_functionality():
    """Test the reset functionality thoroughly"""
    print("Testing reset functionality...")

    # First analyze something
    from pathlib import Path

    backend_path = str(Path("backend").absolute())
    response = requests.post(
        "http://localhost:8000/api/analyze", json={"project_path": backend_path}
    )
    print(f"Initial analysis: {response.status_code}")

    # Check data exists
    response = requests.get("http://localhost:8000/api/data")
    data = response.json()
    has_data_before = data["data"]["has_data"]
    print(f"Data before reset: {has_data_before}")

    # Reset
    response = requests.post("http://localhost:8000/api/reset")
    print(f"Reset: {response.status_code}")

    # Check data is cleared
    response = requests.get("http://localhost:8000/api/data")
    data = response.json()
    has_data_after = data["data"]["has_data"]
    print(f"Data after reset: {has_data_after}")

    return has_data_before and not has_data_after


def test_concurrent_requests():
    """Test handling of concurrent requests"""
    print("Testing concurrent request handling...")

    # Reset first
    requests.post("http://localhost:8000/api/reset")

    # Try to analyze while getting data (should handle gracefully)
    import threading
    import time
    from pathlib import Path

    backend_path = str(Path("backend").absolute())
    results = []

    def analyze():
        response = requests.post(
            "http://localhost:8000/api/analyze", json={"project_path": backend_path}
        )
        results.append(("analyze", response.status_code))

    def get_data():
        time.sleep(0.1)  # Small delay
        response = requests.get("http://localhost:8000/api/data")
        results.append(("data", response.status_code))

    # Start both requests
    t1 = threading.Thread(target=analyze)
    t2 = threading.Thread(target=get_data)

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    print(f"Concurrent results: {results}")
    return all(status == 200 for _, status in results)


def main():
    """Run all edge case tests"""
    print("Python Code Analyzer - Edge Case Testing")
    print("=" * 50)

    try:
        print("\n1. Testing empty project...")
        test_empty_project()

        print("\n2. Testing project with syntax errors...")
        test_project_with_syntax_errors()

        print("\n3. Testing reset functionality...")
        reset_ok = test_reset_functionality()

        print("\n4. Testing concurrent requests...")
        concurrent_ok = test_concurrent_requests()

        print("\n" + "=" * 50)
        print("Edge Case Test Summary:")
        print(
            f"{'✓' if reset_ok else '✗'} Reset functionality: {'PASSED' if reset_ok else 'FAILED'}"
        )
        print(
            f"{'✓' if concurrent_ok else '✗'} Concurrent requests: {'PASSED' if concurrent_ok else 'FAILED'}"
        )

        if reset_ok and concurrent_ok:
            print("\n🎉 Edge case tests PASSED!")
        else:
            print("\n⚠️  Some edge cases need attention")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Please ensure backend is running.")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")


if __name__ == "__main__":
    main()
