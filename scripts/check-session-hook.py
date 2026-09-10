#!/usr/bin/env python3
"""Verify the registered hooks deliver the full skill without output spilling."""

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix="pstack hook check ") as temporary:
    installed = Path(temporary).resolve() / "installed plugin"
    shutil.copytree(root / "hooks", installed / "hooks")
    shutil.copytree(root / "skills/poteto-mode", installed / "skills/poteto-mode")
    groups = json.loads((installed / "hooks/hooks.json").read_text())["hooks"]["SessionStart"]
    assert len(groups) == 1
    group = groups[0]
    for source in ("startup", "resume", "clear", "compact", "fork"):
        assert re.fullmatch(group["matcher"], source), source
        chunks = []
        for number, hook in enumerate(group["hooks"], 1):
            result = subprocess.run(
                hook["command"], shell=True, check=True, capture_output=True,
                text=True, cwd=temporary,
                env={**os.environ, "CLAUDE_PLUGIN_ROOT": str(installed)},
                input=json.dumps({"hook_event_name": "SessionStart", "source": source}),
            )
            assert not result.stderr, result.stderr
            assert len(result.stdout) < 9000
            assert len(result.stdout) < hook["additionalContextLimit"]
            assert f"part {number}/3" in result.stdout
            assert f"Plugin root: {installed}" in result.stdout
            chunks.append(result.stdout.split("--- BEGIN SKILL PART ---\n", 1)[1])
        assert "".join(chunks) == (installed / "skills/poteto-mode/SKILL.md").read_text()
        print(f"PASS {source}: complete skill, inline chunks, installed path with spaces")
