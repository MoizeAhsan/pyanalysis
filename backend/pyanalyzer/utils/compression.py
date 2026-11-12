"""
Data compression utilities for network transfer optimization
"""

import base64
import gzip
import json
import logging
from io import BytesIO
from typing import Any

logger = logging.getLogger(__name__)


class DataCompressor:
    """
    Utility class for compressing data for network transfer
    """

    @staticmethod
    def compress_json_data(data: Any, compression_threshold: int = 1024) -> dict[str, Any]:
        """
        Compress JSON data if it exceeds the threshold size

        Args:
            data: Data to potentially compress
            compression_threshold: Minimum size in bytes to trigger compression

        Returns:
            Dictionary with either original data or compressed data with metadata
        """
        try:
            # Serialize data to JSON
            json_str = json.dumps(data, default=str, separators=(",", ":"))
            original_size = len(json_str.encode("utf-8"))

            # Only compress if data exceeds threshold
            if original_size < compression_threshold:
                return {
                    "compressed": False,
                    "data": data,
                    "original_size": original_size,
                    "compressed_size": original_size,
                }

            # Compress the JSON string
            compressed_data = DataCompressor._compress_string(json_str)
            compressed_size = len(compressed_data)

            # Calculate compression ratio
            compression_ratio = compressed_size / original_size if original_size > 0 else 1.0

            logger.debug(
                "Compressed data: %d bytes -> %d bytes (%.1f%% reduction)",
                original_size,
                compressed_size,
                (1 - compression_ratio) * 100,
            )

            return {
                "compressed": True,
                "data": compressed_data,
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": compression_ratio,
            }

        except Exception as e:
            logger.error("Failed to compress data: %s", e)
            # Return original data if compression fails
            return {"compressed": False, "data": data, "error": str(e)}

    @staticmethod
    def decompress_json_data(compressed_response: dict[str, Any]) -> Any:
        """
        Decompress JSON data if it was compressed

        Args:
            compressed_response: Response from compress_json_data

        Returns:
            Original data
        """
        try:
            if not compressed_response.get("compressed", False):
                return compressed_response.get("data")

            # Decompress the data
            compressed_data = compressed_response["data"]
            json_str = DataCompressor._decompress_string(compressed_data)

            # Parse JSON back to original data
            return json.loads(json_str)

        except Exception as e:
            logger.error("Failed to decompress data: %s", e)
            # Return original data if decompression fails
            return compressed_response.get("data")

    @staticmethod
    def _compress_string(text: str) -> str:
        """
        Compress a string using gzip and encode as base64

        Args:
            text: String to compress

        Returns:
            Base64 encoded compressed string
        """
        # Convert string to bytes
        text_bytes = text.encode("utf-8")

        # Compress using gzip
        buffer = BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode="wb", compresslevel=6) as gz_file:
            gz_file.write(text_bytes)

        # Encode as base64 for JSON serialization
        compressed_bytes = buffer.getvalue()
        return base64.b64encode(compressed_bytes).decode("ascii")

    @staticmethod
    def _decompress_string(compressed_data: str) -> str:
        """
        Decompress a base64 encoded gzip compressed string

        Args:
            compressed_data: Base64 encoded compressed string

        Returns:
            Original string
        """
        # Decode from base64
        compressed_bytes = base64.b64decode(compressed_data.encode("ascii"))

        # Decompress using gzip
        buffer = BytesIO(compressed_bytes)
        with gzip.GzipFile(fileobj=buffer, mode="rb") as gz_file:
            decompressed_bytes = gz_file.read()

        # Convert back to string
        return decompressed_bytes.decode("utf-8")

    @staticmethod
    def estimate_compression_benefit(data: Any) -> dict[str, Any]:
        """
        Estimate compression benefit without actually compressing

        Args:
            data: Data to analyze

        Returns:
            Dictionary with size estimates and recommendations
        """
        try:
            json_str = json.dumps(data, default=str, separators=(",", ":"))
            original_size = len(json_str.encode("utf-8"))

            # Rough estimation: JSON typically compresses to 20-40% of original size
            estimated_compressed_size = int(original_size * 0.3)
            estimated_savings = original_size - estimated_compressed_size

            savings_percent = (estimated_savings / original_size * 100) if original_size > 0 else 0

            return {
                "original_size": original_size,
                "estimated_compressed_size": estimated_compressed_size,
                "estimated_savings": estimated_savings,
                "estimated_savings_percent": savings_percent,
                "recommend_compression": original_size > 1024,  # Recommend for data > 1KB
            }

        except Exception as e:
            logger.error("Failed to estimate compression benefit: %s", e)
            return {"error": str(e), "recommend_compression": False}


def compress_large_response(data: Any, threshold: int = 2048) -> dict[str, Any]:
    """
    Convenience function to compress large API responses

    Args:
        data: Response data to potentially compress
        threshold: Size threshold in bytes for compression

    Returns:
        Compressed response or original data
    """
    compressor = DataCompressor()
    return compressor.compress_json_data(data, threshold)
