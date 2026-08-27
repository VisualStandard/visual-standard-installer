# npm 1.0.14 direct-latest release runbook

This runbook publishes the unchanged public installer wrapper once, directly to
npm `latest`, through npm Trusted Publishing and GitHub Actions OIDC. The private
runtime remains version 1.0.13. There is no staging dist-tag and no npm token in
the publish workflow.

## Immutable release identity

- package: `@visualstandard/install@1.0.14`;
- Git tag: `v1.0.14`;
- private runtime served by the stable backend: `1.0.13`;
- installer protocol: `1.0.7`;
- publish dist-tag: `latest`;
- previous required `latest`: `1.0.6`;
- SHA-256: the sole record in `CHECKSUMS.sha256`.

## One-time GitHub/npm configuration

1. Protect the GitHub environment named `npm` with required reviewers.
2. In npm Trusted Publishers for `@visualstandard/install`, bind exactly:
   - organization/repository: `VisualStandard/visual-standard-installer`;
   - workflow: `.github/workflows/publish.yml`;
   - environment: `npm`.
3. Do not add `NODE_AUTH_TOKEN`, `NPM_TOKEN`, or `NPM_DIST_TAG_TOKEN` to the
   publish job. It authenticates only through `id-token: write`.
4. Protect the GitHub environment named `release` for the later GitHub Release.

## Prepare the immutable source

1. Review the 1.0.14 diff and confirm no installer behavior, endpoint, stable
   contract, entitlement keyring, or creative/runtime source changed.
2. Run `npm test`, `npm run release:preflight`, and the exact local-release
   verifier against the SHA-256 in `CHECKSUMS.sha256`.
3. Merge the reviewed branch into the default branch without modifying the
   audited release files.
4. Create annotated tag `v1.0.14` at that exact commit and push the tag.

## Publish directly to npm latest

1. Confirm npm version 1.0.14 is absent and `latest` is exactly 1.0.6.
2. Open **Actions → Publish audited installer to npm latest → Run workflow**.
3. Select the immutable `v1.0.14` tag as the workflow ref.
4. Choose `publish-latest` and type `publish-1.0.14-to-latest` exactly.
5. Approve the protected `npm` environment only after the verify job is green.
6. The only npm mutation is:

   `npm publish --access public --tag latest --provenance`

7. The workflow must redownload the registry tarball, verify SHA-256/SHA-1/SRI,
   and require `latest=1.0.14`.

Publishing an npm version is immutable. If any precondition differs, stop rather
than changing the workflow constants. If a post-publication check fails, keep
public checkout OFF and obtain separate approval before moving `latest` back to
the previously recorded version; never unpublish or reuse 1.0.14.

## Create the GitHub Release

After npm verification succeeds, run **Create verified GitHub Release** from the
same `v1.0.14` tag and type `create-github-release-v1.0.14`. That workflow
verifies the tag, checksum, registry bytes, and `latest` before creating the
release. It has no npm credentials and performs no npm mutation.

## Stop conditions

Stop before publication if:

- the tag does not resolve to the selected workflow commit;
- version 1.0.14 already exists;
- npm `latest` is not exactly 1.0.6;
- the local or registry tarball differs from `CHECKSUMS.sha256`;
- OIDC trusted publishing or protected-environment approval is unavailable;
- any test or production contract/keyring preflight fails;
- runtime stable 1.0.13 is not the approved production release;
- public checkout is enabled.
