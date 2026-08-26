#!/usr/bin/env bash
# Check the plugin is installable on every target harness.
set -uo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
fail=0
note() { printf '  %s\n' "$*"; }
bad() { printf '  FAIL  %s\n' "$*"; fail=1; }

echo "manifests"
for m in .claude-plugin/plugin.json .claude-plugin/marketplace.json \
         .codex-plugin/plugin.json .cursor-plugin/plugin.json; do
	if [ -f "$root/$m" ] && python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$root/$m" 2>/dev/null; then
		note "ok    $m"
	else
		bad "$m missing or not valid JSON"
	fi
done

echo "skill frontmatter"
for d in "$root"/skills/*/ "$root"/automations/benny/skills/*/; do
	[ -d "$d" ] || continue
	n=$(basename "$d"); f="$d/SKILL.md"
	[ -f "$f" ] || { bad "$n: no SKILL.md"; continue; }
	head -1 "$f" | grep -q '^---$' || bad "$n: no frontmatter"
	name=$(awk -F': *' '/^name:/{print $2; exit}' "$f")
	[ "$name" = "$n" ] || bad "$n: frontmatter name is '$name', must match the directory"
	printf '%s' "$name" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$' \
		|| bad "$n: name '$name' is not lowercase-hyphen (Claude Code rejects it)"
	awk -F': *' '/^description:/{print $2; exit}' "$f" | grep -q . \
		|| bad "$n: empty description"
done
note "checked $(ls -d "$root"/skills/*/ | wc -l | tr -d ' ') skills"

echo "agent frontmatter"
for f in "$root"/agents/*.md; do
	n=$(basename "$f" .md)
	name=$(awk -F': *' '/^name:/{print $2; exit}' "$f")
	[ "$name" = "$n" ] || bad "$(basename "$f"): name is '$name', must match the filename"
	printf '%s' "$name" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$' \
		|| bad "$(basename "$f"): name '$name' is not lowercase-hyphen"
done
note "checked $(ls "$root"/agents/*.md | wc -l | tr -d ' ') agents"

echo "harness layer"
for h in claude-code codex copilot-cli cursor built-ins README; do
	[ -f "$root/harness/$h.md" ] || bad "harness/$h.md missing"
done
[ -x "$root/scripts/detect-harness.sh" ] || bad "detect-harness.sh not executable"
note "detected harness: $("$root/scripts/detect-harness.sh")"

echo "no cursor-only paths left in skills"
# setup-pstack names every harness's rules file symmetrically to explain why
# ~/.pstack/models.md sits outside all of them. That is prose, not a path in use.
if leaked=$(grep -rn '~/\.cursor/rules\|\.cursor/skills\|~/\.cursor/projects' "$root/skills" 2>/dev/null \
		| grep -v '^.*skills/setup-pstack/SKILL.md:.*stays out of'); then
	printf '%s\n' "$leaked" | sed 's/^/  FAIL  /'; fail=1
else
	note "clean"
fi

echo
[ "$fail" -eq 0 ] && echo "PASS" || echo "FAIL"
exit "$fail"
