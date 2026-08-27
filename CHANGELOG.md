# Changelog

All notable public-installer changes are recorded here. This file covers the thin
public installer only; it does not disclose or describe the private creative runtime.

## 1.0.14

- Reissues the unchanged public installer logic for private runtime 1.0.13.
- Publishes the audited package once, directly to npm `latest`, through the existing OIDC trusted-publisher workflow.
- Keeps the stable production contract, Ed25519 keyring, installer protocol, API endpoints, and creative runtime unchanged.

## 1.0.13

- Coordinates the public wrapper with private runtime 1.0.13 on the stable production contract.
- Rotates the production entitlement verification key without changing the installer protocol.
- Adds explicit buyer-safe guidance for every contracted activation and release error.
- Verifies the signed entitlement belongs to Motion Graphics Creator.
- Directs buyers to install from the macOS Terminal before opening Claude Code.
- Uses the official Visual Standard service and production release channel.
- Installs only Motion Graphics Creator by Visual Standard and its `/visual-*` commands.
- Publishes only through the npm `latest` channel with verified provenance.
