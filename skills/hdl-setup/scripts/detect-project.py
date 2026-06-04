#!/usr/bin/env python3
"""
hdl-setup: Project detection script.

Usage:
  python3 detect-project.py --root <project-root>
  python3 detect-project.py --root <project-root> --verify

Outputs a JSON report of each expected path's presence.
Exit code 0 = all present (verify mode) or detection complete (scan mode).
Exit code 1 = one or more required paths missing (verify mode only).
"""

import argparse
import json
import os
import sys
from pathlib import Path

EXPECTED_PATHS = [
    ("docker-compose.yml", "file", "HAPI FHIR local deployment config"),
    ("_bmad-output", "dir", "BMad output folder"),
    ("_bmad-output/ig/input", "dir", "IG publisher input directory"),
    ("_bmad/memory/hdl", "dir", "HDL shared delivery memory root"),
    ("_bmad/memory/hdl/delivery-state.md", "file", "Delivery phase tracking"),
    ("_bmad/memory/hdl/index.md", "file", "Memory orientation index"),
]

REQUIRED_FOR_VERIFY = [
    "_bmad/memory/hdl/delivery-state.md",
    "_bmad/memory/hdl/index.md",
    "_bmad/memory/hdl",
    "_bmad-output",
]


def check_paths(root: Path, paths: list) -> dict:
    results = {}
    for rel_path, kind, description in paths:
        full = root / rel_path
        if kind == "file":
            present = full.is_file()
        else:
            present = full.is_dir()
        results[rel_path] = {
            "present": present,
            "kind": kind,
            "description": description,
            "full_path": str(full),
        }
    return results


def classify(results: dict) -> str:
    present_count = sum(1 for v in results.values() if v["present"])
    return "new" if present_count < 2 else "existing"


def main():
    parser = argparse.ArgumentParser(description="HDL project detection")
    parser.add_argument("--root", required=True, help="Project root directory")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify mode: exit 1 if required paths are missing",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        print(json.dumps({"error": f"Project root does not exist: {root}"}))
        sys.exit(1)

    results = check_paths(root, EXPECTED_PATHS)
    project_type = classify(results)

    report = {
        "project_root": str(root),
        "project_type": project_type,
        "paths": results,
    }

    print(json.dumps(report, indent=2))

    if args.verify:
        missing = [p for p in REQUIRED_FOR_VERIFY if not results.get(p, {}).get("present")]
        if missing:
            sys.stderr.write(f"Verification failed. Missing: {missing}\n")
            sys.exit(1)


if __name__ == "__main__":
    main()
