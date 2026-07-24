# Package provenance

## Candidate 1.0.6

The repository and npm candidate contain only the public Visual Standard installer
wrapper. The wrapper:

1. verifies macOS, Node.js, and Claude Code prerequisites;
2. collects a VS1 license key through a hidden terminal prompt or macOS dialog;
3. activates the Mac through the configured Visual Standard API;
4. verifies the signed authorization token with the versioned public Ed25519 keyring;
5. requests and verifies an authorized private release by HTTPS, byte size, and
   SHA-256;
6. delegates installation to the release's versioned private installer interface;
7. suppresses private component output and reports only buyer-safe success or failure.

The exact candidate tarball checksum is recorded in `CHECKSUMS.sha256` after the
final audited pack. No npm or GitHub publication is implied by this document.

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
