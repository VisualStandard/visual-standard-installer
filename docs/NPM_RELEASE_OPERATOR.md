# npm 1.0.12 release operator runbook

This runbook separates three irreversible or externally visible operations:

1. publish the immutable version once under the non-default `smoke` dist-tag;
2. promote the already-published bytes to `latest` without publishing again;
3. create the GitHub Release without any npm mutation.

The exact approved release is:

- package: `@visualstandard/install@1.0.12`;
- Git tag: `v1.0.12`;
- tag commit: `78d8493a5b6d3629607cbbe801c5ed39e618415d`;
- tarball SHA-256: `077b6b9ef3ac8156c29d3537178ac354f5a86106d5bda948f0b6c6222aa501c7`;
- staging dist-tag: `smoke`.

## One-time repository configuration

- Protect the GitHub `npm` environment with required reviewer approval.
- Keep npm Trusted Publisher bound to this repository, `.github/workflows/publish.yml`, and the `npm` environment.
- Add a short-lived granular npm token as the `NPM_DIST_TAG_TOKEN` environment secret. It is used only by `promote-latest.yml`; the staging workflow uses OIDC trusted publishing instead.
- Protect the GitHub `release` environment with required reviewer approval.
- Do not add npm credentials or `id-token: write` to `github-release.yml`.

## Stage 1.0.12 for the controlled smoke

1. Open **Actions → Stage audited installer for smoke → Run workflow** on the reviewed automation branch.
2. Choose `stage-smoke` and type `stage-1.0.12-as-smoke` exactly.
3. Approve the `npm` environment only after the verification job confirms the tag, package version, keyring, tests, checksum and tarball.
4. The workflow refuses to run if version 1.0.12 already exists, if `smoke` already exists, or if the local tarball differs from the approved SHA-256.
5. The only publish command is `npm publish --access public --tag smoke --provenance`. The workflow records the previous `latest` value and fails unless it remains unchanged after staging.
6. Confirm the staged package using `npx @visualstandard/install@1.0.12` during the controlled smoke. Do not use the unpinned customer command until promotion is complete.

Publishing an npm version is immutable. If the smoke fails, leave `latest` unchanged and stop. Do not attempt to overwrite or reuse 1.0.12.

## Promote the verified bytes to latest

1. Confirm the complete controlled LIVE smoke passed against the staged 1.0.12 tarball.
2. Open **Actions → Promote staged installer to npm latest → Run workflow** and type `promote-1.0.12-to-latest` exactly.
3. Approve the `npm` environment.
4. The workflow downloads the registry tarball, verifies SHA-256/SHA-1/SRI, requires `smoke=1.0.12`, and refuses if `latest` already points to 1.0.12.
5. The only npm mutation is `npm dist-tag add @visualstandard/install@1.0.12 latest`. There is no `npm publish` in this workflow.
6. The final gate redownloads the same immutable tarball and requires both `smoke=1.0.12` and `latest=1.0.12`.

If promotion must be rolled back, stop public sales first and obtain separate approval to restore `latest` to the previously recorded version. Do not unpublish 1.0.12 and do not change its tarball.

## Create the GitHub Release

1. Run this only after npm `latest` has passed the post-promotion verification.
2. Open **Actions → Create verified GitHub Release → Run workflow** and type `create-github-release-v1.0.12` exactly.
3. The workflow requires the immutable tag/commit/checksum and the verified npm `smoke` and `latest` tags.
4. It refuses to overwrite an existing GitHub Release.
5. It has GitHub contents permission only. It has no npm token, no OIDC permission and no npm mutation command.

Creating or publishing a GitHub Release manually is also npm-safe because no workflow listens to a `release` event anymore. Prefer the verified workflow for the audit trail.

## Stop conditions

- tag or commit differs;
- version is already present before staging;
- `smoke` is already occupied;
- local, registry or recorded checksum differs;
- npm provenance is unavailable;
- staging changes `latest`;
- controlled smoke fails;
- promotion would use anything other than the already-published 1.0.12 bytes;
- any workflow asks to republish 1.0.12;
- GitHub Release creation has npm credentials or would overwrite an existing release.
