# Changelog

All notable public-installer changes are recorded here. This file covers the thin
public installer only; it does not disclose or describe the private creative runtime.

## 1.0.10 (release candidate)

- Keeps installer behavior unchanged.
- Pins the verified npm release toolchain and validates every release change before tagging.

## 1.0.9 (release candidate)

- Keeps installer behavior unchanged.
- Runs release verification on macOS, the only supported customer platform.

## 1.0.8 (release candidate)

- Keeps the 1.0.7 installer behavior unchanged.
- Makes the public archive audit compatible with current npm output in GitHub Actions.

## 1.0.7 (release candidate)

- Targets the official `visualstandard.io` commercial service.
- Uses the public `stable` release channel.
- Publishes through GitHub Actions with npm provenance under the `acceptance` tag.
- Keeps the installer dependency-free and free of lifecycle scripts.

## 1.0.6

- Published the auditable Visual Standard installer repository.
- Added official website, documentation, issue, security, and license metadata.
- Added signed-entitlement and authorized-release verification.
- Added checksum and public/private-boundary documentation.
- Standardized the public product identity as Visual Standard Motion Graphics Creator.

Earlier 1.0.x packages were short-lived installer iterations produced before the
public verification repository was finalized. Customers should use the current npm
release unless an official Visual Standard document explicitly requires another version.
