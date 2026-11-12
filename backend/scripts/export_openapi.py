"""Write the API's OpenAPI document to a file (used to generate frontend types).

Usage: python scripts/export_openapi.py ../frontend/openapi.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pyanalyzer.main import create_app
from pyanalyzer.settings import Settings


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    schema = create_app(Settings(static_dir=None)).openapi()
    Path(argv[1]).write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
