#!/usr/bin/env python3
"""Print one bounded, numbered part of the installed poteto-mode skill."""

import sys
from pathlib import Path

PARTS = 3
MAX_OUTPUT = 9000

root = Path(__file__).resolve().parent.parent
skill = root / "skills/poteto-mode/SKILL.md"
text = skill.read_text(encoding="utf-8")
part = int(sys.argv[1])
if not 1 <= part <= PARTS:
    sys.exit(f"Expected a part number from 1 to {PARTS}")
width = (len(text) + PARTS - 1) // PARTS
header = (
    f"pstack poteto-mode session context, part {part}/{PARTS}\n"
    f"Plugin root: {root}\n"
    f"Skill directory: {skill.parent}\n"
    "Poteto mode is active unless the user opts out. The numbered parts contain "
    "the complete skill in order. Resolve playbooks/ relative to the skill "
    "directory and harness/, scripts/, agents/, and skills/ relative to the plugin root.\n"
    "--- BEGIN SKILL PART ---\n"
)
output = header + text[(part - 1) * width : part * width]
if len(output) > MAX_OUTPUT:
    sys.exit("Poteto mode exceeds the inline hook budget. Increase PARTS and hook registrations.")
sys.stdout.write(output)
