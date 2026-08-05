# Visual Standard Motion Graphics Creator

Official installer for Visual Standard Motion Graphics Creator, a macOS tool that turns a script
and optional voiceover into an editable motion-graphics project in Claude Code.

> **Platform support:** macOS only. Node.js 20+ and Claude Code are required.

- Official website: https://visualstandard.io
- Installation: [official installation guide](https://github.com/VisualStandard/visual-standard-installer/blob/main/docs/INSTALL.md)
- Uninstallation: [official uninstallation guide](https://github.com/VisualStandard/visual-standard-installer/blob/main/docs/UNINSTALL.md)
- Troubleshooting: [official troubleshooting guide](https://github.com/VisualStandard/visual-standard-installer/blob/main/docs/TROUBLESHOOTING.md)
- Support: [support policy](https://github.com/VisualStandard/visual-standard-installer/blob/main/SUPPORT.md)
- Versioning and releases: [versioning policy](https://github.com/VisualStandard/visual-standard-installer/blob/main/VERSIONING.md)
- Release history: [changelog](https://github.com/VisualStandard/visual-standard-installer/blob/main/CHANGELOG.md)
- Security policy: [security policy](https://github.com/VisualStandard/visual-standard-installer/blob/main/SECURITY.md)
- Published-package provenance: [provenance record](https://github.com/VisualStandard/visual-standard-installer/blob/main/PROVENANCE.md)
- Public/private boundary: [boundary documentation](https://github.com/VisualStandard/visual-standard-installer/blob/main/docs/PUBLIC_PRIVATE_BOUNDARY.md)
- Published tarball checksum: [release checksums](https://github.com/VisualStandard/visual-standard-installer/blob/main/CHECKSUMS.sha256)
- License terms: https://visualstandard.io/license

## Requirements

- macOS
- Node.js 20 or newer
- Claude Code, installed and signed in
- A valid Visual Standard Motion Graphics Creator license key

## Install

Open the macOS **Terminal** app and run:

```bash
npx @visualstandard/install
```

Do not paste this command into Claude Code. The installer securely asks for the
license key delivered after purchase. It then:

1. activates the current Mac with Visual Standard Motion Graphics Creator;
2. requests an authorized runtime download;
3. verifies the downloaded runtime checksum before installation;
4. delegates installation and diagnostics to the authorized private installer.

The license key is not printed in the command or stored in this npm package.

## Verify the official installer

The public release has one consistent identity:

- npm package: `@visualstandard/install`;
- GitHub organization: `VisualStandard`;
- source repository: `VisualStandard/visual-standard-installer`;
- official website: `visualstandard.io`;
- product: Visual Standard Motion Graphics Creator;
- supported platform: macOS.

The package is dependency-free, defines no npm lifecycle scripts, and exposes one
installer binary. Its reviewed source is this public repository. Installation
writes only to the documented Visual Standard runtime location and the Visual
Standard skill and command locations used by Claude Code.

## Security and package contents

This is a small, auditable installer client. The npm package contains no creative
runtime, customer projects, reference library, private signing key, storage
credentials, or license database. The private runtime is delivered only after
successful license activation and release authorization.

The installer is dependency-free and has no npm lifecycle scripts. Its source can
be inspected before execution with:

```bash
npm pack @visualstandard/install
```

The public repository contains only the thin installer client and its verification
documentation. It does not contain or describe the private motion-graphics runtime, creative
engine, prompts, customer projects, license values, entitlement tokens, signing
secrets, storage credentials, or release archives.

Visual Standard Motion Graphics Creator is proprietary software. Use is
subject to the published license and terms.
