"""
Rebuild src/data/spellListPhb2024.json from docs/rules_copypaste.md
alphabetical spell section (Spells (A) through Appendix A).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "docs" / "rules_copypaste.md"
SPELLS_JSON_PATH = ROOT / "src" / "data" / "spellListPhb2024.json"

SCHOOL_NAMES = (
    "Abjuration",
    "Conjuration",
    "Divination",
    "Enchantment",
    "Evocation",
    "Illusion",
    "Necromancy",
    "Transmutation",
)
_SCHOOL_ALT = "|".join(SCHOOL_NAMES)

CANTIP_RE = re.compile(rf"^({_SCHOOL_ALT})\s+Cantrip\s*\(([^)]+)\)\s*$")
LEVEL_RE = re.compile(rf"^Level\s+(\d+)\s+({_SCHOOL_ALT})\s*\(([^)]+)\)\s*$")

NOISE_LINE = re.compile(
    r"^(https?://|9/\d+/\d+|ARTIST:|\d+/\d+/\d+,\s+\d+:\d+\s+AM|Player.s Handbook\s*$|.*dndbeyond\.com)",
    re.I,
)


def spell_section_lines() -> list[str]:
    lines = RULES_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip().startswith("Spells (A)"))
    end = next(
        i
        for i in range(start + 1, len(lines))
        if lines[i].strip().startswith("Appendix A: The Multiverse")
    )
    return lines[start:end]


def find_spell_starts(section: list[str]) -> list[int]:
    starts: list[int] = []
    for i in range(len(section) - 1):
        l1 = section[i].strip()
        l2 = section[i + 1].strip()
        if CANTIP_RE.match(l2) or LEVEL_RE.match(l2):
            if l1 and not l1.startswith("Spells ("):
                starts.append(i)
    return starts


def is_noise_line(stripped: str) -> bool:
    if not stripped:
        return False
    if NOISE_LINE.match(stripped):
        return True
    if stripped.startswith("↑"):
        return True
    return False


def parse_components(comp: str) -> dict[str, bool]:
    comp = comp.strip()
    return {
        "v": bool(re.search(r"\bV\b", comp)),
        "s": bool(re.search(r"\bS\b", comp)),
        "m": bool(re.search(r"\bM\b", comp)),
    }


def normalize_range(s: str) -> str:
    s = s.strip()
    s = re.sub(r"(\d+)\s*feet\b", r"\1 ft", s, flags=re.I)
    return s


def normalize_casting_time(raw: str) -> str:
    s = raw.strip()
    ritual_suffix = ""
    if " or Ritual" in s:
        ritual_suffix = " or Ritual"
        s = s.replace(" or Ritual", "").strip()

    low = s.lower()
    action_map = {
        "action": "1 Action",
        "bonus action": "1 Bonus Action",
        "reaction": "1 Reaction",
    }
    if low in action_map:
        return action_map[low] + ritual_suffix

    # e.g. "1 minute", "10 minutes", "1 hour", "12 hours"
    m = re.match(r"^(\d+)\s*(minute|minutes|hour|hours|day|days)\b", low)
    if m:
        n, unit = m.group(1), m.group(2)
        if unit.startswith("minute"):
            unit_out = "Minute" if n == "1" else "Minutes"
        elif unit.startswith("hour"):
            unit_out = "Hour" if n == "1" else "Hours"
        elif unit.startswith("day"):
            unit_out = "Day" if n == "1" else "Days"
        else:
            unit_out = unit
        return f"{n} {unit_out}{ritual_suffix}"

    # Fallback: title-ish
    return s + ritual_suffix


def duration_flags(duration: str) -> tuple[bool, bool]:
    d = duration.strip()
    conc = d.lower().startswith("concentration")
    ritual = "ritual" in d.lower() and "or ritual" not in d.lower()
    return conc, ritual


def parse_spell_block(section: list[str], start: int, end: int) -> dict:
    name = section[start].strip()
    header = section[start + 1].strip()

    m_c = CANTIP_RE.match(header)
    m_l = LEVEL_RE.match(header)
    if m_c:
        level = 0
        school = m_c.group(1)
        classes = [c.strip() for c in m_c.group(2).split(",") if c.strip()]
    elif m_l:
        level = int(m_l.group(1))
        school = m_l.group(2)
        classes = [c.strip() for c in m_l.group(3).split(",") if c.strip()]
    else:
        raise ValueError(f"Bad header for {name!r}: {header!r}")

    i = start + 2
    casting_raw = ""
    range_raw = ""
    comp_raw = ""
    duration_raw = ""

    while i < end:
        line = section[i]
        stripped = line.strip()
        if stripped.startswith("Casting Time:"):
            casting_raw = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("Range:"):
            range_raw = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("Components:") or stripped.startswith("Component:"):
            comp_raw = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("Duration:"):
            duration_raw = stripped.split(":", 1)[1].strip()
            i += 1
            break
        i += 1

    desc_parts: list[str] = []
    while i < end:
        stripped = section[i].strip()
        if is_noise_line(stripped):
            i += 1
            continue
        if stripped:
            desc_parts.append(stripped)
        i += 1

    description = "\n".join(desc_parts).strip()
    is_conc, _ = duration_flags(duration_raw)
    is_ritual = "or Ritual" in casting_raw or "or ritual" in casting_raw.lower()

    return {
        "name": name,
        "level": level,
        "castingTime": normalize_casting_time(casting_raw),
        "range": normalize_range(range_raw),
        "components": parse_components(comp_raw),
        "isRitual": is_ritual,
        "isConcentration": is_conc,
        "description": description,
        "school": school,
        "classes": classes,
    }


def parse_all_spells() -> list[dict]:
    section = spell_section_lines()
    starts = find_spell_starts(section)
    spells: list[dict] = []
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else len(section)
        spells.append(parse_spell_block(section, s, e))
    return spells


def main() -> None:
    spells = parse_all_spells()
    names = [s["name"] for s in spells]
    if len(names) != len(set(names)):
        from collections import Counter

        dupes = [n for n, c in Counter(names).items() if c > 1]
        raise SystemExit(f"Duplicate spell names: {dupes}")

    SPELLS_JSON_PATH.write_text(
        json.dumps(spells, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(spells)} spells to {SPELLS_JSON_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
