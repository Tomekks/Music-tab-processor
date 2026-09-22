/**
 * Tailwind arbitrary-value class for a background-color state overlay,
 * color-mixed from a base color toward an overlay color at the magnitude of
 * a --state-*-opacity custom property (a token -- re-derives live if a
 * brand edits it, never a hardcoded percentage). Generalizes what
 * Button.tsx's PRIMARY_HOVER used to inline for hover only; the pressed
 * (`"active"` pseudo) case is new -- see this task's spec §0 for why
 * `focus` deliberately does not get one.
 * @param {"hover" | "active"} pseudo Tailwind pseudo-class variant prefix.
 * @param {string} opacityVar e.g. "--state-hover-opacity" or
 *   "--state-pressed-opacity".
 * @param {string} [baseColorVar] defaults to the accent/on-accent pair --
 *   the only pair any component needs today (§0).
 * @param {string} [overlayColorVar]
 * @returns {string}
 */
export function stateOverlayClassName(
  pseudo,
  opacityVar,
  baseColorVar = "--color-accent",
  overlayColorVar = "--color-on-accent",
) {
  return `${pseudo}:[background-color:color-mix(in_srgb,var(${baseColorVar})_calc(100%_-_var(${opacityVar})),var(${overlayColorVar})_var(${opacityVar}))]`;
}
