# Visual Standard Motion Graphics Creator

Official installer for Visual Standard Motion Graphics Creator, a macOS tool that turns a script
and optional voiceover into an editable motion-graphics project in Claude Code.

- Official website: https://visualstandard.io
- Installation: [docs/INSTALL.md](docs/INSTALL.md)
- Uninstallation: [docs/UNINSTALL.md](docs/UNINSTALL.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Published-package provenance: [PROVENANCE.md](PROVENANCE.md)
- Public/private boundary: [docs/PUBLIC_PRIVATE_BOUNDARY.md](docs/PUBLIC_PRIVATE_BOUNDARY.md)
- Published tarball checksum: [CHECKSUMS.sha256](CHECKSUMS.sha256)
- License terms: https://visualstandard.io/license

## Requirements

- macOS
- Node.js 20 or newer
- Claude Code, installed and signed in
- A valid Visual Standard Motion Graphics Creator license key

## Install

Open Claude Code and ask it to run:

```bash
npx @visualstandard/install
```

The installer securely asks for the license key delivered after purchase. It then:

1. activates the current Mac with Visual Standard Motion Graphics Creator;
2. requests an authorized runtime download;
3. verifies the downloaded runtime checksum before installation;
4. delegates installation and diagnostics to the authorized private installer.

The license key is not printed in the command or stored in this npm package.

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
