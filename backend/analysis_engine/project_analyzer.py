"""
Project analyzer that orchestrates the analysis pipeline
"""

import gc
import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

import psutil

from models.core import ProjectInfo, CodeElement, AnalysisSession, current_session
from parsers.python_ast_parser import PythonASTParser
from analysis_engine.file_scanner import FileSystemScanner
from graph.dependency_graph_builder import DependencyGraphBuilder
from analyzers.usage_analyzer import UsageAnalyzer
from analyzers.dependency_analyzer import DependencyAnalyzer
from analyzers.pattern_detector import ArchitecturalPatternDetector

logger = logging.getLogger(__name__)


class AnalysisProgress:
    """Track progress of analysis operations"""

    def __init__(self, total_files: int = 0):
        self.total_files = total_files
        self.processed_files = 0
        self.failed_files = 0
        self.current_file = ""
        self.start_time = datetime.now()
        self.lock = threading.Lock()

    def update(self, current_file: str, success: bool = True) -> None:
        """Update progress with current file being processed"""
        with self.lock:
            self.current_file = current_file
            self.processed_files += 1
            if not success:
                self.failed_files += 1

    def get_progress_info(self) -> Dict[str, Any]:
        """Get current progress information"""
        with self.lock:
            elapsed = (datetime.now() - self.start_time).total_seconds()
            progress_percent = (
                (self.processed_files / self.total_files * 100)
                if self.total_files > 0
                else 0
            )

            return {
                "total_files": self.total_files,
                "processed_files": self.processed_files,
                "failed_files": self.failed_files,
                "current_file": self.current_file,
                "progress_percent": progress_percent,
                "elapsed_seconds": elapsed,
                "is_complete": self.processed_files >= self.total_files,
            }


class ProjectAnalyzer:
    """
    Main analyzer class that orchestrates the analysis pipeline
    """

    def __init__(self, max_workers: Optional[int] = None, memory_limit_mb: int = 1024):
        """
        Initialize the project analyzer

        Args:
            max_workers: Maximum number of worker threads for parallel processing.
                        If None, uses CPU count * 2 for I/O bound tasks
            memory_limit_mb: Memory limit in MB before triggering cleanup
        """
        self.file_scanner = FileSystemScanner()
        self.ast_parser = PythonASTParser()
        self.graph_builder = DependencyGraphBuilder()
        self.usage_analyzer = UsageAnalyzer()
        self.dependency_analyzer = DependencyAnalyzer()
        self.pattern_detector = ArchitecturalPatternDetector()

        # Optimize worker count based on system resources
        if max_workers is None:
            cpu_count = os.cpu_count() or 4
            # For I/O bound tasks like file parsing, use more threads than CPU cores
            self.max_workers = min(cpu_count * 2, 16)  # Cap at 16 to avoid overhead
        else:
            self.max_workers = max_workers

        self.memory_limit_mb = memory_limit_mb
        self.current_progress: Optional[AnalysisProgress] = None

        # Memory monitoring
        self.process = psutil.Process()
        self._last_memory_check = 0

    def analyze_project(self, project_path: str) -> AnalysisSession:
        """
        Analyze a Python project and return analysis results

        Args:
            project_path: Path to the project directory

        Returns:
            AnalysisSession containing all analysis results

        Raises:
            ValueError: If project path is invalid
            PermissionError: If project is not accessible
        """
        logger.info("Starting analysis of project: %s", project_path)

        # Reset current session for new analysis
        current_session.reset()

        # Validate project path
        path = Path(project_path)
        if not path.exists():
            raise ValueError(f"Project path does not exist: {project_path}")
        if not path.is_dir():
            raise ValueError(f"Project path is not a directory: {project_path}")

        try:
            # Step 1: Scan for Python files
            logger.info("Scanning for Python files...")
            python_files = self.file_scanner.scan_project(project_path)

            if not python_files:
                logger.warning("No Python files found in project: %s", project_path)

            # Step 2: Get project statistics
            project_stats = self.file_scanner.get_project_stats(project_path)

            # Step 3: Create project info
            project_info = ProjectInfo(
                name=path.name,
                path=str(path.absolute()),
                total_files=project_stats["total_files"],
                total_lines=project_stats["total_lines"],
                analysis_timestamp=datetime.now(),
            )
            current_session.project_info = project_info

            # Step 4: Initialize progress tracking
            self.current_progress = AnalysisProgress(len(python_files))

            # Step 5: Parse files and extract code elements with optimized batching
            logger.info("Parsing %d Python files...", len(python_files))
            all_elements = self._parse_files_optimized(python_files)

            # Step 6: Store elements in session
            for element in all_elements:
                current_session.add_element(element)

            # Step 7: Analyze dependencies
            logger.info("Analyzing dependencies...")
            self.dependency_analyzer.analyze_dependencies(all_elements, python_files)

            # Step 8: Analyze usage patterns
            logger.info("Analyzing usage patterns...")
            self.usage_analyzer.analyze_usage(all_elements, python_files)

            # Step 9: Build dependency graph
            logger.info("Building dependency graph...")
            dependency_graph = self.graph_builder.build_graph(all_elements)
            current_session.dependency_graph = dependency_graph

            # Step 10: Detect architectural patterns
            logger.info("Detecting architectural patterns...")
            patterns = self.pattern_detector.detect_patterns(
                all_elements, dependency_graph
            )
            current_session.architectural_patterns = patterns

            logger.info(
                "Analysis complete. Processed %d files, extracted %d elements, "
                "built graph with %d nodes and %d edges, detected %d patterns",
                len(python_files),
                len(all_elements),
                dependency_graph.metrics.node_count if dependency_graph.metrics else 0,
                dependency_graph.metrics.edge_count if dependency_graph.metrics else 0,
                len(patterns),
            )

            return current_session

        except Exception as e:
            logger.error("Analysis failed: %s", e)
            current_session.reset()
            raise

    def _parse_files_optimized(self, file_paths: List[str]) -> List[CodeElement]:
        """
        Parse multiple files with optimized memory usage and parallel processing

        Args:
            file_paths: List of Python file paths to parse

        Returns:
            List of all extracted code elements
        """
        all_elements: List[CodeElement] = []
        total_files = len(file_paths)

        if total_files == 0:
            return all_elements

        # Calculate optimal batch size based on memory constraints
        batch_size = self._optimize_batch_size(total_files)

        logger.info(
            "Processing %d files in batches of %d with %d workers",
            total_files, batch_size, self.max_workers
        )

        # Process files in batches to manage memory usage
        for i in range(0, total_files, batch_size):
            batch_files = file_paths[i:i + batch_size]
            batch_elements = self._parse_files_batch(batch_files)
            all_elements.extend(batch_elements)

            # Memory management between batches
            if i > 0 and i % (batch_size * 3) == 0:  # Every 3 batches
                self._check_memory_usage()

            logger.debug(
                "Processed batch %d/%d (%d files), total elements: %d",
                (i // batch_size) + 1,
                (total_files + batch_size - 1) // batch_size,
                len(batch_files),
                len(all_elements)
            )

        return all_elements

    def _parse_files_batch(self, file_paths: List[str]) -> List[CodeElement]:
        """
        Parse multiple files in parallel and extract code elements

        Args:
            file_paths: List of Python file paths to parse

        Returns:
            List of all extracted code elements
        """
        all_elements: List[CodeElement] = []

        if self.max_workers == 1 or len(file_paths) < 4:
            # Single-threaded processing for small batches
            for file_path in file_paths:
                elements = self._parse_single_file(file_path)
                all_elements.extend(elements)
        else:
            # Multi-threaded processing with optimized worker count
            effective_workers = min(self.max_workers, len(file_paths))

            with ThreadPoolExecutor(max_workers=effective_workers) as executor:
                # Submit all parsing tasks
                future_to_file = {
                    executor.submit(self._parse_single_file, file_path): file_path
                    for file_path in file_paths
                }

                # Collect results as they complete
                for future in as_completed(future_to_file):
                    file_path = future_to_file[future]
                    try:
                        elements = future.result()
                        all_elements.extend(elements)
                    except (OSError, UnicodeDecodeError, SyntaxError) as e:
                        logger.error("Failed to parse file %s: %s", file_path, e)
                        if self.current_progress:
                            self.current_progress.update(file_path, success=False)

        return all_elements

    def _parse_single_file(self, file_path: str) -> List[CodeElement]:
        """
        Parse a single file and extract code elements

        Args:
            file_path: Path to Python file

        Returns:
            List of code elements from the file
        """
        elements: List[CodeElement] = []

        try:
            # Update progress
            if self.current_progress:
                self.current_progress.update(file_path, success=True)

            # Parse the file
            file_ast = self.ast_parser.parse_file(file_path)
            if file_ast:
                # Extract elements from AST
                elements = self.ast_parser.extract_elements(file_ast)
                logger.debug("Extracted %d elements from %s", len(elements), file_path)
            else:
                logger.warning("Failed to parse file: %s", file_path)

        except (OSError, UnicodeDecodeError, SyntaxError) as e:
            logger.error("Error parsing file %s: %s", file_path, e)
            if self.current_progress:
                self.current_progress.update(file_path, success=False)

        return elements

    def get_analysis_progress(self) -> Optional[Dict[str, Any]]:
        """
        Get current analysis progress information

        Returns:
            Progress information dictionary or None if no analysis in progress
        """
        if self.current_progress:
            return self.current_progress.get_progress_info()
        return None

    def reset_analysis(self) -> None:
        """
        Reset current analysis and clear all data
        """
        logger.info("Resetting analysis session")
        current_session.reset()
        self.current_progress = None
        # Force garbage collection after reset
        gc.collect()

    def _check_memory_usage(self) -> None:
        """
        Check current memory usage and trigger cleanup if needed
        """
        try:
            memory_mb = self.process.memory_info().rss / 1024 / 1024
            if memory_mb > self.memory_limit_mb:
                logger.warning(
                    "Memory usage (%.1f MB) exceeds limit (%.1f MB), triggering cleanup",
                    memory_mb, self.memory_limit_mb
                )
                gc.collect()
                # Log memory after cleanup
                new_memory_mb = self.process.memory_info().rss / 1024 / 1024
                logger.info("Memory after cleanup: %.1f MB", new_memory_mb)
        except Exception as e:
            logger.debug("Failed to check memory usage: %s", e)

    def _optimize_batch_size(self, total_files: int) -> int:
        """
        Calculate optimal batch size based on available memory and file count
        
        Args:
            total_files: Total number of files to process
            
        Returns:
            Optimal batch size for processing
        """
        try:
            # Get available memory
            available_memory_mb = psutil.virtual_memory().available / 1024 / 1024

            # Estimate memory per file (rough estimate: 50KB per file)
            estimated_memory_per_file_mb = 0.05

            # Calculate safe batch size (use 25% of available memory)
            safe_memory_mb = available_memory_mb * 0.25
            max_batch_size = int(safe_memory_mb / estimated_memory_per_file_mb)

            # Ensure reasonable bounds
            batch_size = max(10, min(max_batch_size, total_files, 1000))

            logger.debug(
                "Calculated batch size: %d (available memory: %.1f MB, total files: %d)",
                batch_size, available_memory_mb, total_files
            )

            return batch_size

        except Exception as e:
            logger.debug("Failed to calculate optimal batch size: %s", e)
            # Fallback to conservative batch size
            return min(100, total_files)
