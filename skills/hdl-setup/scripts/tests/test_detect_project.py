#!/usr/bin/env python3
"""
Tests for detect-project.py
Run: python3 -m pytest tests/test_detect_project.py -v
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "detect-project.py"


def run_detect(root: str, verify: bool = False) -> tuple[int, dict]:
    cmd = [sys.executable, str(SCRIPT), "--root", root]
    if verify:
        cmd.append("--verify")
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        data = {}
    return result.returncode, data


def test_empty_dir_classified_as_new():
    with tempfile.TemporaryDirectory() as tmp:
        code, report = run_detect(tmp)
        assert code == 0
        assert report["project_type"] == "new"


def test_existing_project_detected():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "docker-compose.yml").write_text("version: '3'")
        (root / "_bmad-output").mkdir()
        (root / "_bmad" / "memory" / "hdl").mkdir(parents=True)
        code, report = run_detect(tmp)
        assert code == 0
        assert report["project_type"] == "existing"


def test_verify_fails_when_memory_missing():
    with tempfile.TemporaryDirectory() as tmp:
        code, _ = run_detect(tmp, verify=True)
        assert code == 1


def test_verify_passes_when_all_present():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "docker-compose.yml").write_text("version: '3'")
        (root / "_bmad-output" / "ig" / "input").mkdir(parents=True)
        hdl = root / "_bmad" / "memory" / "hdl"
        hdl.mkdir(parents=True)
        (hdl / "delivery-state.md").write_text("# state")
        (hdl / "index.md").write_text("# index")
        code, _ = run_detect(tmp, verify=True)
        assert code == 0


def test_invalid_root_returns_error():
    code, report = run_detect("/nonexistent/path/xyz")
    assert code == 1
    assert "error" in report
