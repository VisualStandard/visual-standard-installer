# Public/private installer boundary

The npm package is a public verification wrapper. It owns environment checks,
secure VS1 input, activation, local Ed25519 verification, authorized download, size
and SHA-256 verification, and buyer-safe output.

After verification, the wrapper extracts the authorized archive into a user-only
temporary directory and invokes:

```text
package/installer-entry.mjs
```

The wrapper passes a user-only temporary handoff file through
`VISUAL_STANDARD_INSTALL_HANDOFF` and the canonical destination through
`VISUAL_STANDARD_RUNTIME_HOME`. The handoff is removed after the private component
returns. Tokens are never placed in command arguments or public output.

The private entrypoint owns runtime application, internal compatibility, update
preservation, Claude Code file installation, and diagnostics. Its stdout is
suppressed; a non-zero exit becomes a generic buyer-safe installation error.

Every authorized private release must contain this entrypoint. The public wrapper
fails closed when the entrypoint is absent.
