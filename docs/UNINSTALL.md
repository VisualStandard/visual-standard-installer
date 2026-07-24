# Uninstall or archive

The safest reversible operation is to archive the managed installation rather than
delete it.

Run the following in Terminal:

```bash
archive_root="$HOME/Visual-Standard-Archive/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$archive_root/runtime" "$archive_root/claude-commands" "$archive_root/claude-skills"

if [ -e "$HOME/.visual-standard/motion-graphics-creator" ]; then
  mv "$HOME/.visual-standard/motion-graphics-creator" "$archive_root/runtime/"
fi

for command_file in \
  visual-atelier.md \
  visual-create.md \
  visual-index.md \
  visual-market.md \
  visual-mono.md \
  visual-resume.md \
  visual-signal.md \
  visual-update.md
do
  if [ -f "$HOME/.claude/commands/$command_file" ]; then
    mv "$HOME/.claude/commands/$command_file" "$archive_root/claude-commands/"
  fi
done

if [ -d "$HOME/.claude/skills/motion-graphics-creator" ]; then
  mv "$HOME/.claude/skills/motion-graphics-creator" "$archive_root/claude-skills/"
fi

printf 'Archived to %s\n' "$archive_root"
```

This moves only the Visual Standard runtime location, the eight exact managed
commands, and the exact managed skill. It does not modify any other Claude Code
command, skill, setting, project, or account data.

To install again:

```bash
npx @visualstandard/install
```

Keep the archive until the replacement installation has passed its diagnostics and
your retained projects have been verified.
