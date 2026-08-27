# Package provenance

## Release 1.0.14

Version 1.0.14 is the production installer wrapper for private runtime 1.0.13 on
the official `https://visualstandard.io` service. Its installer behavior, stable
contract, public entitlement keyring, and runtime protocol are unchanged from
the audited 1.0.13 wrapper. The release-only delta is package identity,
documentation, checksum, and the OIDC workflow that publishes once directly to
npm `latest` after operator approval.

The npm package patch version is `1.0.14`. Its private-release compatibility
capability remains installer protocol `1.0.7`; documentation and
workflow-only patches do not raise the minimum compatible private installer version.

The repository and published npm package contain only the public Visual Standard installer
wrapper. The wrapper:

1. verifies macOS, Node.js, and Claude Code prerequisites;
2. collects a VS1 license key through a hidden terminal prompt or macOS dialog;
3. activates the Mac through the configured Visual Standard API;
4. verifies the signed authorization token with the versioned public Ed25519 keyring;
5. requests and verifies an authorized private release by HTTPS, byte size, and
   SHA-256;
6. delegates installation to the release's versioned private installer interface;
7. suppresses private component output and reports only buyer-safe success or failure.

The exact published tarball checksum is recorded in `CHECKSUMS.sha256`. Compare
that value with a locally downloaded package before investigating or executing it.

## Boundary

The public wrapper does not implement runtime application, updates, diagnostics,
creative behavior, or project handling. Those responsibilities remain behind the
authorized private installer interface.

This repository and package must never contain:

- a private runtime or private release archive;
- creative-engine source, prompts, references, primitives, or authoring material;
- customer scripts, voiceovers, projects, renders, logs, or installation state;
- license values, authorization tokens, bearer tokens, or signed download URLs;
- private signing keys, backend credentials, storage credentials, or service
  secrets.
