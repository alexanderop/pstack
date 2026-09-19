#!/usr/bin/env python3
"""Check native discovery metadata and prevent automatic mode injection."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
marketplace = json.loads((root / '.agents/plugins/marketplace.json').read_text())
manifest = json.loads((root / '.codex-plugin/plugin.json').read_text())
assert marketplace['name'] == manifest['name'] == 'pstack'
assert len(marketplace['plugins']) == 1
entry = marketplace['plugins'][0]
assert entry['name'] == manifest['name']
assert entry['source'] == {'source': 'local', 'path': '.'}
assert entry['policy'] == {'installation': 'AVAILABLE', 'authentication': 'ON_INSTALL'}
assert entry['category'] == 'Productivity'
assert (root / manifest['skills']).is_dir()
for filename in ('.codex-plugin/plugin.json', '.claude-plugin/plugin.json'):
    assert 'hooks' not in json.loads((root / filename).read_text()), filename
for filename in ('hooks/hooks.json', 'hooks.json', '.codex/hooks.json'):
    assert not (root / filename).exists(), f'Automatic hooks must not ship: {filename}'
skills = sorted((root / 'skills').glob('*/SKILL.md'))
for skill in skills:
    if skill.parent.name in ('setup-pstack', 'browse-web'):
        continue
    metadata = (skill.parent / 'agents/openai.yaml').read_text()
    assert '\npolicy:\n  allow_implicit_invocation: false\n' in metadata, skill
browser_metadata = (root / 'skills/browse-web/agents/openai.yaml').read_text()
assert '\npolicy:\n  allow_implicit_invocation: true\n' in browser_metadata
print(f'PASS: native marketplace, {len(skills) - 2} explicit-only skills, browser discovery enabled, no automatic hooks')
