"""
File system scanner for discovering Python files in project directories
"""

import logging
from pathlib import Path
from typing import List, Set, Generator, Optional, Dict, Any

logger = logging.getLogger(__name__)


class FileSystemScanner:
    """
    Scanner for recursively discovering Python files in project directories
    """

    def __init__(self, exclude_patterns: Optional[Set[str]] = None):
        """
        Initialize the file scanner

        Args:
            exclude_patterns: Set of directory/file patterns to exclude
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
        Get basic statistics about the project

        Args:
            project_path: Path to the project directory

        Returns:
            Dictionary with project statistics
        """
        python_files = self.scan_project(project_path)

        total_lines = 0
        total_files = len(python_files)

        for file_path in python_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    total_lines += sum(1 for _ in f)
            except (OSError, UnicodeDecodeError):
                # Skip files that can't be read
                continue

        return {
            "total_files": total_files,
            "total_lines": total_lines,
            "python_files": python_files,
        }
