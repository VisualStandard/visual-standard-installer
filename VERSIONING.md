# Versioning and release policy

The public installer uses semantic versioning:

- **Patch** (`1.0.x`): compatible installer fixes, documentation corrections, and security hardening.
- **Minor** (`1.x.0`): compatible new installer capabilities or new public workflow options.
- **Major** (`x.0.0`): incompatible changes to the public install or activation contract.

## Release discipline

Each release must:

1. pass the repository test suite;
2. contain only the files allowlisted in `package.json`;
3. contain no private runtime, secret, customer content, or retired public identity;
4. have its public tarball checksum recorded in `CHECKSUMS.sha256`;
5. update `CHANGELOG.md` when behavior changes;
6. keep the npm package, GitHub repository, documentation, and official website consistent.

Avoid multiple speculative public releases. Validate one candidate fully, then
publish one deliberate version. Never reuse or overwrite an existing npm version.
