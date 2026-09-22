import test from "node:test";
import assert from "node:assert/strict";
import { generateNeutralRamp, generateAccentPair } from "./generate-ramp.mjs";

function luminance(hexColor) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hexColor.slice(i + 1, i + 3), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const NEUTRAL_SEEDS = {
  "warm neutral (this brand's actual paper)": "#faf9f5",
  "cool neutral": "#eef1f5",
  "saturated (this brand's actual accent, stress-testing high chroma as a neutral seed)": "#ae97f7",
};

for (const [label, seedHex] of Object.entries(NEUTRAL_SEEDS)) {
  const ramp = generateNeutralRamp(seedHex);
  for (const theme of ["light", "dark"]) {
    const t = ramp[theme];
    const pairs = [
      ["background/foreground", t.background, t.foreground],
      ["surface/surfaceText", t.surface, t.surfaceText],
      ["surfaceActive/surfaceActiveText", t.surfaceActive, t.surfaceActiveText],
    ];
    for (const [name, a, b] of pairs) {
      test(`${label} [${theme}] ${name} meets WCAG AA (4.5:1)`, () => {
        const r = ratio(a, b);
        assert.ok(r >= 4.5, `${a} on ${b} is ${r.toFixed(2)}:1, below 4.5:1`);
      });
    }
  }
}

const ACCENT_SEEDS = ["#ae97f7", "#e0524d", "#3d7a5c"];
for (const seedHex of ACCENT_SEEDS) {
  test(`accent/onAccent for seed ${seedHex} meets WCAG AA (4.5:1)`, () => {
    const { accent, onAccent } = generateAccentPair(seedHex);
    const r = ratio(accent, onAccent);
    assert.ok(r >= 4.5, `${accent} on ${onAccent} is ${r.toFixed(2)}:1, below 4.5:1`);
  });
}

test("generateNeutralRamp returns all 8 NeutralTones keys for both themes", () => {
  const ramp = generateNeutralRamp("#faf9f5");
  const keys = [
    "background", "foreground", "border", "surface",
    "surfaceText", "surfaceHover", "surfaceActive", "surfaceActiveText",
  ];
  for (const theme of ["light", "dark"]) {
    for (const key of keys) {
      assert.equal(typeof ramp[theme][key], "string", `${theme}.${key} missing or not a string`);
      assert.match(ramp[theme][key], /^#[0-9a-f]{6}$/, `${theme}.${key} is not a #rrggbb hex string`);
    }
  }
});

test("generateAccentPair returns accent and onAccent as #rrggbb hex strings", () => {
  const { accent, onAccent } = generateAccentPair("#ae97f7");
  assert.match(accent, /^#[0-9a-f]{6}$/);
  assert.match(onAccent, /^#[0-9a-f]{6}$/);
});
