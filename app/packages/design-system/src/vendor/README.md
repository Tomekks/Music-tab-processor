# Vendored: material-color-utilities

Files under `material-color-utilities/` are unmodified copies from the npm package
`@material/material-color-utilities@0.4.0` (Apache-2.0, upstream:
https://github.com/material-foundation/material-color-utilities), vendored instead of
installed as a dependency because the package cannot be `import`ed under plain Node.js ESM
(see `docs/specs/design-system-generate-ramp.md` §0 for the full reason). Only the 8 files
this package's `generate-ramp.mjs` actually needs are included — the rest of the upstream
package (color extraction from images, dynamic theming schemes, quantizers) isn't used here.

Each file carries its own original Apache-2.0 license header. `LICENSE` here is the upstream
package's full license text, copied alongside per Apache-2.0 §4. No files have been modified
from upstream — to upgrade, re-run the vendoring procedure in the spec above against a newer
version and diff.
