# Context: Design System

The multi-brand token system under `app/packages/design-system`, and its
planned brand-management UI (create/switch/delete brands). Currently lives
inside `guitar_tab_processor`; see the Brand Management ADR for its intended
future as a standalone, independently-consumed project.

## Language

**Brand**:
A full, resolvable set of design-system token values (color, radius, space,
typography, etc.) that styles one consuming project or surface. Every brand
shares the same token schema — no brand adds or removes a variable another
brand lacks; brands diverge only in values, never in shape.
_Avoid_: Theme, skin

**Main brand**:
The one brand that cannot be deleted (implemented today as "default"/the
root brand). Every other brand's Revert action resets a field against
Main's live current value.
_Avoid_: Default brand, root brand (both still used in code/specs; Main is
the product-facing term)

**Child brand**:
Any brand other than Main. Its `tokens.json` stays sparse — an unedited
field is simply absent and resolves live from Main at read time (today's
shipped `resolveBrandTree` mechanism, kept as-is). Editing a field creates
a real override; Revert deletes it, returning to live inheritance.

**New brand** (create action):
Creates a child brand with zero overrides — every field inherits Main's
live value from creation onward, following any future Main edit
automatically until a specific field is touched.

**Duplicate brand** (create action):
Creates a child brand with every field explicitly overridden to the chosen
source brand's current values, frozen at that instant. Does not follow the
source (or Main) afterward for any field that was set at duplication time —
only an explicit edit or Revert changes it from there. Available on any
brand, Main included.

**Distribution**:
Always-latest — every consumer reads the design system's current values on
each load, no versioning or pinning. CSS-only output (custom properties);
no second export format planned until a real non-CSS consumer exists.

**Project**:
A consumer that reads exactly one Brand's CSS: today the web app and Control
Center, later any other site. Which Brand a Project uses is set in the
workbench under the Brand (planned; today one `active-brand.json` pointer
serves every consumer).
_Avoid_: App, site, consumer (all fine in conversation, but Project is the
product term)

### Tokens and structure

**Token**:
A single named design value (a color, a length, a font) that a Brand sets.
_Avoid_: Variable, field (both still appear in the editor's UI and code)

**Foundation**:
A group of cross-cutting Tokens that belong to no single Component: color
roles, radius, space, typography, state opacities, focus ring, layout.
_Avoid_: Semantic tokens, globals

**Component**:
A reusable interface element of the design system that owns its own group of
Tokens (Button, Icon Button, Slider, Segmented Control, Color Field).
_Avoid_: Widget, control

**Variant**:
A named version of a Component chosen by one of its options, such as a
Button's primary or secondary look.
_Avoid_: Type, kind, style

**State**:
A condition a Component can be in that changes its look: hover, pressed,
disabled, focused.
_Avoid_: Status

**Override**:
A Child brand's own value for a Token in a given Mode, replacing the value it
would inherit from Main. An Override can be switched off, which falls back to
Main's value while keeping the stored value, and switched back on to restore
it. Revert is different: it removes the Override entirely.
_Avoid_: Customization, local value

**Mode**:
The light or dark appearance a Brand is shown in. A Token that differs
between Modes has a value for each.
_Avoid_: Theme (reserved against Brand), dark theme
