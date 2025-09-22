"""
File system scanner for discovering Python files in project directories
"""

import logging
import os
from pathlib import Path
from typing import List, Set, Generator, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)


class FileSystemScanner:
    """
    Scanner for recursively discovering Python files in project directories
    """

    def __init__(
        self,
        exclude_patterns: Optional[Set[str]] = None,
        max_workers: Optional[int] = None
    ):
        """
        Initialize the file scanner

        Args:
            exclude_patterns: Set of directory/file patterns to exclude
            max_workers: Maximum number of worker threads for parallel scanning
        """
        self.exclude_patterns = exclude_patterns or {
            "__pycache__",
            ".git",
            ".svn",
            ".hg",
            "node_modules",
            ".venv",
            "venv",
            ".env",
            "env",
            ".mypy_cache",
            ".pytest_cache",
            ".ruff_cache",
            "build",
            "dist",
            "*.egg-info",
            ".tox",
            "htmlcov",
            ".coverage",
        }

        # Optimize worker count for I/O bound directory scanning
        if max_workers is None:
            cpu_count = os.cpu_count() or 4
            self.max_workers = min(cpu_count, 8)  # Cap at 8 for directory scanning
        else:
            self.max_workers = max_workers

    def scan_project(self, project_path: str) -> List[str]:
        """
        Recursively scan project directory for Python files

        Args:
            project_path: Path to the project directory

        Returns:
            List of Python file paths

        Raises:
            ValueError: If project path is invalid
            PermissionError: If directory is not accessible
        """
        path = Path(project_path)

        if not path.exists():
            raise ValueError(f"Project path does not exist: {project_path}")

        if not path.is_dir():
            raise ValueError(f"Project path is not a directory: {project_path}")

        try:
            # Test if directory is accessible
            list(path.iterdir())
        except PermissionError as e:
            raise PermissionError(f"Cannot access directory: {project_path}") from e

        python_files = []
        skipped_files = []

        logger.info("Starting scan of project: %s", project_path)

        for file_path in self._discover_python_files(path):
            try:
                # Verify file is readable
                with open(file_path, "r", encoding="utf-8") as f:
                    # Just try to read first line to verify accessibility
                    f.readline()
                python_files.append(str(file_path))
            except (PermissionError, UnicodeDecodeError, OSError) as e:
                logger.warning("Skipping inaccessible file %s: %s", file_path, e)
                skipped_files.append(str(file_path))

        logger.info(
            "Scan complete. Found %d Python files, skipped %d files",
            len(python_files),
            len(skipped_files),
        )

        return python_files

    def _discover_python_files(self, root_path: Path) -> Generator[Path, None, None]:
        """
        Generator that yields Python file paths recursively

        Args:
            root_path: Root directory to scan

        Yields:
            Path objects for Python files
        """
        try:
            for item in root_path.iterdir():
                # Skip excluded patterns
                if self._should_exclude(item):
                    logger.debug("Excluding: %s", item)
                    continue

                if item.is_file() and item.suffix == ".py":
                    yield item
                elif item.is_dir():
                    # Recursively scan subdirectories
                    try:
                        yield from self._discover_python_files(item)
                    except PermissionError:
                        logger.warning(
                            "Permission denied accessing directory: %s", item
                        )
                        continue

        except PermissionError:
            logger.warning("Permission denied accessing directory: %s", root_path)

    def _should_exclude(self, path: Path) -> bool:
        """
        Check if a path should be excluded based on exclude patterns

        Args:
            path: Path to check

        Returns:
            True if path should be excluded
        """
        name = path.name

        # Check exact matches
        if name in self.exclude_patterns:
            return True

        # Check pattern matches (simple glob-style)
        for pattern in self.exclude_patterns:
            if pattern.startswith("*") and name.endswith(pattern[1:]):
                return True
            if pattern.endswith("*") and name.startswith(pattern[:-1]):
                return True

        return False

    def get_project_stats(self, project_path: str) -> Dict[str, Any]:
        """
        Get basic statistics about the project with parallel line counting

        Args:
            project_path: Path to the project directory

        Returns:
            Dictionary with project statistics
        """
        python_files = self.scan_project(project_path)
        total_files = len(python_files)
        if total_files == 0:
            return {
                "total_files": 0,
                "total_lines": 0,
                "python_files": [],
            }

        # Count lines in parallel for better performance
        total_lines = self._count_lines_parallel(python_files)

        return {
            "total_files": total_files,
            "total_lines": total_lines,
            "python_files": python_files,
        }

    def _count_lines_parallel(self, file_paths: List[str]) -> int:
        """
        Count lines in multiple files using parallel processing
        
        Args:
            file_paths: List of file paths to count lines in

        Returns:
            Total line count across all files
        """
        total_lines = 0

        if len(file_paths) < 10 or self.max_workers == 1:
            # Use single-threaded for small file counts
            for file_path in file_paths:
                total_lines += self._count_lines_single_file(file_path)
        else:
            # Use multi-threaded for larger file counts
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_file = {
                    executor.submit(self._count_lines_single_file, file_path): file_path
                    for file_path in file_paths
                }

                for future in as_completed(future_to_file):
                    try:
                        line_count = future.result()
                        total_lines += line_count
                    except Exception as e:
                        file_path = future_to_file[future]
                        logger.debug("Failed to count lines in %s: %s", file_path, e)

        return total_lines

    def _count_lines_single_file(self, file_path: str) -> int:
        """
        Count lines in a single file

        Args:
            file_path: Path to the file

        Returns:
            Number of lines in the file
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return sum(1 for _ in f)
        except (OSError, UnicodeDecodeError):
            # Skip files that can't be read
            return 0
