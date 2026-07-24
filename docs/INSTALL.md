# Install

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

Run:

```bash
npx @visualstandard/install
```

The installer requests the license key through a secure terminal prompt or hidden
macOS dialog. Do not place a license key in a command, chat message, shell history,
environment file, issue, or support ticket.

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
