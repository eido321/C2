"""
Backward-compatible entry point. Full rebuild from rules is in sync_spell_list_phb2024.py.
Run: python tools/sync_spell_list_phb2024.py
"""
from __future__ import annotations

import runpy
from pathlib import Path

if __name__ == "__main__":
    runpy.run_path(
        str(Path(__file__).resolve().parent / "sync_spell_list_phb2024.py"),
        run_name="__main__",
    )
