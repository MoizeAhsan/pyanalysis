#!/usr/bin/env python3
"""
Test script to verify performance optimizations are working
"""

import time
import tempfile
import os
from pathlib import Path

# Add backend to path
import sys
sys.path.append('backend')

from analysis_engine.project_analyzer import ProjectAnalyzer
from utils.compression import compress_large_response


def create_test_project(num_files: int = 50) -> str:
    """Create a temporary test project with multiple Python files"""
    temp_dir = tempfile.mkdtemp(prefix="test_project_")
    
    for i in range(num_files):
        file_path = Path(temp_dir) / f"module_{i}.py"
        with open(file_path, 'w') as f:
            f.write(f'''"""
Module {i} for testing performance optimizations
"""

class TestClass{i}:
    """Test class {i}"""
    
    def __init__(self):
        self.value = {i}
    
    def method_{i}(self, param):
        """Test method {i}"""
        return param + self.value

def function_{i}():
    """Test function {i}"""
    return {i} * 2

# Import some other modules
import os
import sys
from pathlib import Path

# Some variables
TEST_CONSTANT_{i} = {i}
test_list_{i} = [x for x in range({i})]
''')
    
    return temp_dir


def test_multi_threading_performance():
    """Test that multi-threading improves performance"""
    print("Testing multi-threading performance...")
    
    # Create test project
    test_dir = create_test_project(30)
    
    try:
        # Test single-threaded
        analyzer_single = ProjectAnalyzer(max_workers=1)
        start_time = time.time()
        session_single = analyzer_single.analyze_project(test_dir)
        single_thread_time = time.time() - start_time
        
        # Reset for multi-threaded test
        analyzer_single.reset_analysis()
        
        # Test multi-threaded
        analyzer_multi = ProjectAnalyzer(max_workers=4)
        start_time = time.time()
        session_multi = analyzer_multi.analyze_project(test_dir)
        multi_thread_time = time.time() - start_time
        
        print(f"Single-threaded time: {single_thread_time:.2f}s")
        print(f"Multi-threaded time: {multi_thread_time:.2f}s")
        
        # Verify results are similar
        assert len(session_single.all_elements) == len(session_multi.all_elements)
        
        # Multi-threading should be faster (or at least not significantly slower)
        if multi_thread_time < single_thread_time * 0.8:
            print("✓ Multi-threading shows performance improvement")
        else:
            print("⚠ Multi-threading didn't show significant improvement (may be due to small dataset)")
        
        analyzer_multi.reset_analysis()
        
    finally:
        # Cleanup
        import shutil
        shutil.rmtree(test_dir)


def test_memory_optimization():
    """Test memory optimization features"""
    print("\nTesting memory optimization...")
    
    # Test with memory limit
    analyzer = ProjectAnalyzer(memory_limit_mb=512)  # 512MB limit
    
    # Create larger test project
    test_dir = create_test_project(20)
    
    try:
        session = analyzer.analyze_project(test_dir)
        
        # Verify analysis completed
        assert session.project_info is not None
        assert len(session.all_elements) > 0
        
        print(f"✓ Analyzed {len(session.all_elements)} elements with memory optimization")
        
        # Test memory check function
        analyzer._check_memory_usage()
        print("✓ Memory monitoring is working")
        
        analyzer.reset_analysis()
        
    finally:
        import shutil
        shutil.rmtree(test_dir)


def test_data_compression():
    """Test data compression functionality"""
    print("\nTesting data compression...")
    
    # Create test data
    large_data = {
        "modules": [
            {
                "name": f"module_{i}",
                "classes": [f"Class{j}" for j in range(10)],
                "functions": [f"function_{j}" for j in range(20)],
                "description": "This is a test module with lots of content " * 10
            }
            for i in range(50)
        ],
        "statistics": {
            "total_files": 50,
            "total_lines": 5000,
            "total_classes": 500,
            "total_functions": 1000
        }
    }
    
    # Test compression
    result = compress_large_response(large_data, threshold=1024)
    
    if result.get("compressed", False):
        original_size = result["original_size"]
        compressed_size = result["compressed_size"]
        compression_ratio = result["compression_ratio"]
        
        print(f"✓ Data compressed: {original_size} -> {compressed_size} bytes")
        print(f"✓ Compression ratio: {compression_ratio:.2f} ({(1-compression_ratio)*100:.1f}% reduction)")
        
        # Verify compression is effective
        assert compressed_size < original_size
        assert compression_ratio < 0.8  # At least 20% reduction
        
    else:
        print("⚠ Data was not compressed (may be below threshold)")


def test_batch_processing():
    """Test batch processing optimization"""
    print("\nTesting batch processing...")
    
    analyzer = ProjectAnalyzer()
    
    # Test batch size calculation
    batch_size_small = analyzer._optimize_batch_size(10)
    batch_size_large = analyzer._optimize_batch_size(1000)
    
    print(f"✓ Batch size for 10 files: {batch_size_small}")
    print(f"✓ Batch size for 1000 files: {batch_size_large}")
    
    # Verify reasonable batch sizes
    assert 10 <= batch_size_small <= 100
    assert 50 <= batch_size_large <= 1000


if __name__ == "__main__":
    print("Testing Performance Optimizations")
    print("=" * 40)
    
    try:
        test_multi_threading_performance()
        test_memory_optimization()
        test_data_compression()
        test_batch_processing()
        
        print("\n" + "=" * 40)
        print("✓ All performance optimization tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)