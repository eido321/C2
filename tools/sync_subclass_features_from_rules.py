"""
Extract PHB 2024 subclass features from docs/rules_copypaste.md (each Level N: … block).
Writes src/data/phb2024SubclassFeaturesFromRules.json
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "docs" / "rules_copypaste.md"
OUT_PATH = ROOT / "src" / "data" / "phb2024SubclassFeaturesFromRules.json"

# Section: (class_name, start_line "X Subclasses", end_line next class chapter ↑)
# Line numbers 1-based from read_file / grep (verified against rules_copypaste.md)
SECTIONS: list[tuple[str, str, str]] = [
    ("Barbarian", "Barbarian Subclasses", "Bard ↑"),
    ("Bard", "Bard Subclasses", "Cleric ↑"),
    ("Cleric", "Cleric Subclasses", "Druid ↑"),
    ("Druid", "Druid Subclasses", "Fighter ↑"),
    ("Fighter", "Fighter Subclasses", "Monk ↑"),
    ("Monk", "Monk Subclasses", "Paladin ↑"),
    ("Paladin", "Paladin Subclasses", "Ranger ↑"),
    ("Ranger", "Ranger Subclasses", "Rogue ↑"),
    ("Rogue", "Rogue Subclasses", "Sorcerer ↑"),
    ("Sorcerer", "Sorcerer Subclasses", "Warlock ↑"),
    ("Warlock", "Warlock Subclasses", "Wizard ↑"),
    ("Wizard", "Wizard Subclasses", "Chapter 4: Character Origins ↑"),
]

# Words lowercased when not first/last (matches PHB title casing, e.g. Path of the Berserker).
_SMALL = frozenset(
    {
        "a",
        "an",
        "and",
        "as",
        "at",
        "but",
        "by",
        "for",
        "if",
        "in",
        "nor",
        "of",
        "on",
        "or",
        "so",
        "the",
        "to",
        "with",
    }
)

BANNER_SUBCLASS_RE = re.compile(r"^(.+?) SUBCLASS\s*$")


def subclass_title_from_banner_line(line: str) -> str | None:
    """e.g. 'PATH OF THE BERSERKER SUBCLASS' -> 'Path of the Berserker'."""
    m = BANNER_SUBCLASS_RE.match(line.strip())
    if not m:
        return None
    raw = m.group(1).strip()
    if not raw:
        return None
    words = raw.lower().split()
    out: list[str] = []
    for i, w in enumerate(words):
        is_edge = i == 0 or i == len(words) - 1
        if not is_edge and w in _SMALL:
            out.append(w)
        else:
            out.append(w.capitalize())
    return " ".join(out)


def discover_subclass_titles(lines: list[str]) -> frozenset[str]:
    """Subclass names are taken from '… SUBCLASS' banner lines so we stay in sync with rules_copypaste.md."""
    names: set[str] = set()
    for ln in lines:
        t = subclass_title_from_banner_line(ln)
        if t:
            names.add(t)
    return frozenset(names)

NOISE = re.compile(
    r"^(https?://|9/\d+/\d+,\s|ARTIST:|Player.s Handbook\s*$|.*dndbeyond\.com|\d+/\d+/\d+,\s+\d+:\d+\s+AM|↑\s*$)",
    re.I,
)
LEVEL_LINE = re.compile(r"^Level (\d+):\s*(.+)$")
# Sidebar / continued-chapter junk that appears after some features in the paste PDF.
CHAPTER_HEADER_LINE = re.compile(r"^Chapter \d+:")


def is_noise(s: str) -> bool:
    s = s.strip()
    if not s:
        return True
    if NOISE.match(s):
        return True
    if BANNER_SUBCLASS_RE.match(s):
        return True
    return False


def slice_section(lines: list[str], start_marker: str, end_marker: str) -> list[str]:
    text = "\n".join(lines)
    i0 = None
    for i, ln in enumerate(lines):
        if ln.strip() == start_marker:
            i0 = i
            break
    if i0 is None:
        raise SystemExit(f"Start marker not found: {start_marker!r}")
    i1 = None
    for j in range(i0 + 1, len(lines)):
        if lines[j].strip() == end_marker:
            i1 = j
            break
    if i1 is None:
        raise SystemExit(f"End marker not found after {start_marker!r}: {end_marker!r}")
    return lines[i0 + 1 : i1]


def parse_section(lines: list[str], class_name: str) -> list[dict]:
    titles = discover_subclass_titles(lines)
    if not titles:
        raise SystemExit(
            f"No '… SUBCLASS' banners found for {class_name!r}; check rules_copypaste.md section markers."
        )
    current: str | None = None
    out: list[dict] = []
    i = 0
    while i < len(lines):
        raw = lines[i]
        s = raw.strip()
        if s in titles:
            current = s
            i += 1
            continue
        if is_noise(s):
            i += 1
            continue
        m = LEVEL_LINE.match(s)
        if not m:
            i += 1
            continue
        level = int(m.group(1))
        fname = m.group(2).strip()
        body_lines: list[str] = []
        i += 1
        while i < len(lines):
            s2 = lines[i].strip()
            if LEVEL_LINE.match(s2):
                break
            if s2 in titles:
                break
            if CHAPTER_HEADER_LINE.match(s2):
                break
            if not is_noise(s2):
                body_lines.append(s2)
            i += 1
        desc = "\n".join(body_lines).strip()
        if not current:
            continue
        out.append(
            {
                "className": class_name,
                "subclass": current,
                "name": fname,
                "acquiredAtLevel": level,
                "description": desc,
            }
        )
    return out


def main() -> None:
    lines = RULES_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    all_rows: list[dict] = []
    for class_name, start_m, end_m in SECTIONS:
        chunk = slice_section(lines, start_m, end_m)
        rows = parse_section(chunk, class_name)
        all_rows.extend(rows)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(all_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(all_rows)} subclass features to {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
