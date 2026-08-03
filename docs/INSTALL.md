# Install

This installer supports **macOS only**.

## From purchase to first reel

1. Complete the purchase through the official Visual Standard website.
2. Wait for the purchase email containing your Visual Standard license key.
3. Confirm that Node.js 20+ and Claude Code are installed and that Claude Code is signed in.
4. Open Claude Code and paste `npx @visualstandard/install`.
5. Enter the license key only in the installer's hidden license prompt.
6. Wait for installation and diagnostics to finish.
7. Start a new Claude Code session if the new command is not immediately visible.
8. Run `/visual-create` and provide a script plus an optional voiceover.

The success page and purchase email should always show the same command. The
license key must never be appended to the command.

## Requirements

- macOS
- Node.js 20 or newer
- npm
- Claude Code installed and signed in
- a valid Visual Standard Motion Graphics Creator license key

## Inspect before running

Download the public package without executing it:

```bash
npm pack @visualstandard/install
tar -tzf visualstandard-install-*.tgz
```

The archive must contain only the thin installer files listed in `package.json`.
It must not contain a private runtime archive, creative source, customer data, or
credentials.

## Install

Open Claude Code and paste:

```bash
npx @visualstandard/install
```

The installer requests the license key through a secure terminal prompt or hidden
macOS dialog. Do not place a license key in a command, chat message, shell history,
environment file, issue, or support ticket.

The official public identity is `@visualstandard/install` on npm,
`VisualStandard/visual-standard-installer` on GitHub, and `visualstandard.io` on
the web. The package is dependency-free, has no npm lifecycle scripts, and its
reviewed source is public in that repository.

The default public runtime location is:

```text
~/.visual-standard/motion-graphics-creator
```

Use `VISUAL_STANDARD_HOME` only when a custom user-owned runtime location is needed.

After installation, open Claude Code and run:

```text
/visual-create
```

The installed public commands are `/visual-create`, `/visual-resume`,
`/visual-update`, `/visual-signal`, `/visual-index`, `/visual-mono`,
`/visual-atelier`, and `/visual-market`. The installed skill is
`motion-graphics-creator`.

If installation stops or Claude Code refuses to run the package, use the
[troubleshooting guide](TROUBLESHOOTING.md). Do not keep retrying with different
commands or expose the license key while troubleshooting.
