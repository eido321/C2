"""
Parse PHB 2024 Chapter 5 feat descriptions from docs/rules_copypaste.md and write
src/data/phb2024FeatsFromRules.json for use by src/data/feats.ts.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "docs" / "rules_copypaste.md"
OUT_PATH = ROOT / "src" / "data" / "phb2024FeatsFromRules.json"

NOISE = re.compile(
    r"^(https?://|9/\d+/\d+,\s|ARTIST:|Player.s Handbook\s*$|.*dndbeyond\.com|\d+/\d+/\d+,\s+\d+:\d+\s+AM)",
    re.I,
)


def feat_section_lines() -> list[str]:
    lines = RULES_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip() == "Origin Feats ↑")
    end = next(
        i
        for i in range(start + 1, len(lines))
        if lines[i].strip().startswith("Chapter 6: Equipment")
    )
    return lines[start:end]


def looks_like_feat_name(line: str) -> bool:
    s = line.strip()
    if not s or len(s) < 2:
        return False
    if s.startswith("These feats") or s.endswith("Feats ↑"):
        return False
    if s.startswith("http") or s.startswith("9/11/24"):
        return False
    if s in ("Fast Crafting", "Artisan’s Tools", "Crafted Gear"):
        return False
    return True


def merge_category_line(lines: list[str], j: int) -> tuple[int, str]:
    if j >= len(lines):
        return j, ""
    line = lines[j].strip()
    if line == "Origin Feat":
        return j + 1, line
    parts = [line]
    j += 1
    while j < len(lines) and not parts[-1].endswith(")"):
        parts.append(lines[j].strip())
        j += 1
    return j, " ".join(parts)


def extract_prereq(category_line: str) -> str | None:
    if category_line == "Origin Feat":
        return None
    m = re.search(r"\(Prerequisite:\s*([^)]+)\)", category_line)
    return m.group(1).strip() if m else None


def source_from_category(category_line: str) -> tuple[str, bool]:
    if category_line == "Origin Feat":
        return "Origin", True
    if category_line.startswith("General Feat"):
        return "General", False
    if category_line.startswith("Fighting Style Feat"):
        return "Fighting Style", False
    if category_line.startswith("Epic Boon Feat"):
        return "Epic Boon", False
    return "General", False


SECTION_HEADER = re.compile(
    r"^(Origin|General|Fighting Style|Epic Boon) Feats\s*↑?\s*$", re.I
)


def clean_body_lines(raw: list[str]) -> str:
    out: list[str] = []
    for ln in raw:
        s = ln.strip()
        if not s:
            continue
        if NOISE.match(s):
            continue
        if s.startswith("↑"):
            continue
        if SECTION_HEADER.match(s):
            continue
        if re.match(r"^These feats are in the .+ category\.?$", s, re.I):
            continue
        if s.startswith("Chapter 6:"):
            break
        out.append(s)
    return "\n".join(out).strip()


def find_feat_starts(lines: list[str]) -> list[int]:
    starts: list[int] = []
    for i in range(len(lines) - 1):
        nxt = lines[i + 1].strip()
        if nxt == "Origin Feat":
            if looks_like_feat_name(lines[i]):
                starts.append(i)
            continue
        if (
            nxt.startswith("General Feat ")
            or nxt.startswith("Fighting Style Feat ")
            or nxt.startswith("Epic Boon Feat ")
        ):
            if looks_like_feat_name(lines[i]):
                starts.append(i)
    return starts


def parse_feats() -> list[dict]:
    section = feat_section_lines()
    starts = find_feat_starts(section)
    feats: list[dict] = []

    for k, s in enumerate(starts):
        end = starts[k + 1] if k + 1 < len(starts) else len(section)
        name = section[s].strip()
        j, cat_line = merge_category_line(section, s + 1)
        prereq = extract_prereq(cat_line)
        source, is_origin = source_from_category(cat_line)
        body_lines = section[j:end]
        body = clean_body_lines(body_lines)
        if prereq:
            description = f"Prerequisite: {prereq}\n\n{body}"
        else:
            description = body

        if name == "Magic Initiate":
            mi_text = description
            for label in ("Cleric", "Druid", "Wizard"):
                feats.append(
                    {
                        "name": f"Magic Initiate ({label})",
                        "source": source,
                        "isOrigin": is_origin,
                        "description": mi_text,
                    }
                )
        else:
            feats.append(
                {
                    "name": name,
                    "source": source,
                    "isOrigin": is_origin,
                    "description": description,
                }
            )

    return feats


def main() -> None:
    feats = parse_feats()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(feats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(feats)} feats to {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
