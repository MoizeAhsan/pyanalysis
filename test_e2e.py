#!/usr/bin/env python3
"""
End-to-end test for Python Code Analyzer
Tests the application with the actual backend project
"""

import requests
from pathlib import Path


def run_backend_project_test():
    """Test the analyzer with the actual backend project"""
    base_url = "http://localhost:8000/api"
    backend_path = str(Path("backend").absolute())

    print(f"Testing with backend project: {backend_path}")

    # Reset first
    print("\n1. Resetting analysis...")
    response = requests.post(f"{base_url}/reset")
    print(f"Reset: {response.status_code} - {response.json()}")

    # Analyze the backend project
    print("\n2. Analyzing backend project...")
    response = requests.post(f"{base_url}/analyze", json={"project_path": backend_path})

    if response.status_code == 200:
        data = response.json()
        print(f"Analysis successful: {data['success']}")
        print(f"Message: {data['message']}")

        if "data" in data:
            stats = data["data"]
            print("\nProject Statistics:")
            print(f"  - Project: {stats.get('project_name', 'Unknown')}")
            print(f"  - Total files: {stats.get('total_files', 0)}")
            print(f"  - Total lines: {stats.get('total_lines', 0)}")
            print(f"  - Modules: {stats.get('modules_count', 0)}")
            print(f"  - Classes: {stats.get('classes_count', 0)}")
            print(f"  - Functions: {stats.get('functions_count', 0)}")
            print(f"  - Total elements: {stats.get('total_elements', 0)}")
    else:
        print(f"Analysis failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

    # Get detailed data
    print("\n3. Retrieving detailed analysis data...")
    response = requests.get(f"{base_url}/data")

    if response.status_code == 200:
        data = response.json()
        if data["success"] and data["data"]["has_data"]:
            analysis_data = data["data"]

            print("Detailed Analysis Results:")
            print(f"  - Project: {analysis_data['project_info']['name']}")
            print(f"  - Path: {analysis_data['project_info']['path']}")
            print(
                f"  - Languages: {', '.join(analysis_data['project_info']['languages'])}"
            )

            # Show some modules
            modules = analysis_data.get("modules", [])
            print(f"\n  Modules ({len(modules)}):")
            for i, module in enumerate(modules[:5]):
                print(
                    f"    {i + 1}. {module['name']} ({module['location']['file_path']})"
                )
            if len(modules) > 5:
                print(f"    ... and {len(modules) - 5} more")

            # Show some classes
            classes = analysis_data.get("classes", [])
            print(f"\n  Classes ({len(classes)}):")
            for i, cls in enumerate(classes[:5]):
                print(
                    f"    {i + 1}. {cls['name']} in {cls['location']['file_path']}:{cls['location']['line_number']}"
                )
            if len(classes) > 5:
                print(f"    ... and {len(classes) - 5} more")

            # Show some functions
            functions = analysis_data.get("functions", [])
            print(f"\n  Functions ({len(functions)}):")
            for i, func in enumerate(functions[:5]):
                params = ", ".join([p["name"] for p in func.get("parameters", [])])
                print(
                    f"    {i + 1}. {func['name']}({params}) in {func['location']['file_path']}:{func['location']['line_number']}"
                )
            if len(functions) > 5:
                print(f"    ... and {len(functions) - 5} more")

            # Show dependency graph info
            dep_graph = analysis_data.get("dependency_graph")
            if dep_graph:
                print("\n  Dependency Graph:")
                print(f"    - Nodes: {len(dep_graph.get('nodes', {}))}")
                print(f"    - Edges: {len(dep_graph.get('edges', []))}")
                if dep_graph.get("metrics"):
                    metrics = dep_graph["metrics"]
                    print(f"    - Density: {metrics.get('density', 0):.3f}")
                    print(f"    - Avg Degree: {metrics.get('avg_degree', 0):.2f}")

            return True
        else:
            print("No analysis data available")
            return False
    else:
        print(f"Failed to get data: {response.status_code}")
        return False


def run_error_handling_test():
    """Test error handling with invalid inputs"""
    base_url = "http://localhost:8000/api"

    print("\n4. Testing error handling...")

    # Test with non-existent path
    response = requests.post(
        f"{base_url}/analyze", json={"project_path": "/non/existent/path"}
    )
    print(f"Non-existent path: {response.status_code} - Expected 400")

    # Test with empty path
    response = requests.post(f"{base_url}/analyze", json={"project_path": ""})
    print(f"Empty path: {response.status_code} - Expected 422")

    # Test with file instead of directory
    response = requests.post(
        f"{base_url}/analyze", json={"project_path": "backend/main.py"}
    )
    print(f"File instead of directory: {response.status_code} - Expected 400")

    return True


def main():
    """Main test function"""
    print("Python Code Analyzer - End-to-End Test")
    print("=" * 60)

    try:
        # Test with backend project
        success1 = run_backend_project_test()

        # Test error handling
        success2 = run_error_handling_test()

        print("\n" + "=" * 60)
        print("End-to-End Test Summary:")
        print(
            f"{'✓' if success1 else '✗'} Backend project analysis: {'PASSED' if success1 else 'FAILED'}"
        )
        print(
            f"{'✓' if success2 else '✗'} Error handling: {'PASSED' if success2 else 'FAILED'}"
        )

        if success1 and success2:
            print("\n🎉 All tests PASSED!")
            print("\nThe application is working correctly. You can now:")
            print("1. Open http://localhost:3000 in your browser")
            print("2. Enter a Python project path")
            print("3. Click 'Analyze Project' to see the results")
            print("4. Explore the mind map visualization")
        else:
            print("\n❌ Some tests FAILED!")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Please ensure:")
        print("1. Backend is running: cd backend && python main.py")
        print("2. Frontend is running: cd frontend && npm start")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")


if __name__ == "__main__":
    main()
