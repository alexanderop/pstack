#!/usr/bin/env python3
"""Check skill inventory and bundled files against an upstream pstack tree."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
upstream = Path(sys.argv[1]).resolve()
expected = {p.parent.name for p in (upstream / 'skills').glob('*/SKILL.md')}
actual = {p.parent.name for p in (root / 'skills').glob('*/SKILL.md')}
if not expected:
    raise SystemExit(f'No upstream skills found in {upstream}')
failures = []
if expected != actual:
    failures.append(f'Skill inventory differs: missing {sorted(expected - actual)}, extra {sorted(actual - expected)}')
version = json.loads((upstream / '.cursor-plugin/plugin.json').read_text())['version']
for manifest in ['.cursor-plugin/plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']:
    if json.loads((root / manifest).read_text())['version'].split('+', 1)[0] != version:
        failures.append(f'{manifest}: expected version {version}')
missing = [p.relative_to(upstream).as_posix() for p in upstream.rglob('*')
           if p.is_file() and not (root / p.relative_to(upstream)).is_file()]
if missing:
    failures.append(f'Missing upstream files: {missing}')
unchanged = [name for name in sorted(expected & actual)
             if (upstream / 'skills' / name / 'SKILL.md').read_bytes()
             == (root / 'skills' / name / 'SKILL.md').read_bytes()]
print(f'Upstream {version}: {len(expected)} skills; port: {len(actual)} skills')
print(f'{len(unchanged)} skill entrypoints are byte-identical; {len(actual) - len(unchanged)} have port adaptations')
for failure in failures:
    print(f'FAIL: {failure}')
if failures:
    raise SystemExit(1)
print('PASS: skill inventory, versions, and upstream files')
