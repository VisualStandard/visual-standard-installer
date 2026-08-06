# Troubleshooting

Visual Standard Motion Graphics Creator currently supports **macOS only**.

## Claude Code does not recognize the package

Claude Code may ask where the installer came from, especially shortly after a new
release. Confirm all three official identifiers before approving anything:

- npm package: `@visualstandard/install`
- GitHub organization: `VisualStandard`
- website: `visualstandard.io`

If Claude Code offers to inspect the package first, allow the inspection and compare
its contents with the allowlist in `package.json`. Do not substitute a different
package name or pipe an unrelated URL into a shell.

## Inspect without executing

```bash
npm pack @visualstandard/install
tar -tzf visualstandard-install-*.tgz
```

The archive must contain only the public thin-installer files. It must not contain
a private runtime, customer data, credentials, or creative-engine source.

## The license email has not arrived

Check the email address used at checkout and its spam or promotions folders. Use the
customer-support route on the official website if delivery still fails. Do not buy
again solely to force another email, and never post the license key publicly.

## The license is rejected

Confirm that the complete key begins with `VS1-` and enter it only in the hidden
installer prompt. Do not add spaces, quotation marks, or the key to the install
command. If it is still rejected, stop retrying and use the official support route.

## Activation limit reached

A license supports the number of Macs stated at purchase. Archive or deactivate an
old installation through the official customer workflow before activating another.
Do not modify local activation files manually.

## The command exists but `/visual-create` does not

Finish installation, quit and reopen the Claude app, open **Code**, and start a new
**Local** session. Cloud sessions do not load personal skills installed on the Mac.
Then run `/visual-create`. If it is still absent in a Local session, report the
installer version and the final non-sensitive diagnostic message.

## Installation is interrupted

Do not repeatedly start parallel installer processes. Let the current process stop,
then run the same official command once. If the problem repeats, collect only the
non-sensitive error message and report it through the official support route.

## Archive and reinstall

Follow [UNINSTALL.md](UNINSTALL.md). It uses a reversible archive and does not delete
unrelated Claude Code settings, commands, skills, projects, or conversations.
