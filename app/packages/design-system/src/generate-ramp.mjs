// generate-ramp.mjs
import { Hct } from "./vendor/material-color-utilities/hct/hct.js";
import { TonalPalette } from "./vendor/material-color-utilities/palettes/tonal_palette.js";
import { argbFromHex, hexFromArgb } from "./vendor/material-color-utilities/utils/string_utils.js";

function tone(palette, t) {
  return hexFromArgb(palette.tone(t));
}

// Tone indices below were verified during spec-writing against 3 seed hues (this brand's
// actual current neutral seed #faf9f5, a cool neutral #eef1f5, and this brand's actual current
// accent #ae97f7 used as a stress-test neutral seed) and 3 accent seeds (#ae97f7, #e0524d,
// #3d7a5c) -- every background/foreground, surface/surfaceText, surfaceActive/surfaceActiveText,
// and accent/onAccent pair produced hits at least 7.4:1, comfortably above the 4.5:1 floor. Not
// guesswork -- implement as given. If your own tests (written first, per §7) disagree with this,
// that's a signal to check your implementation against this exact code, not to re-derive new
// tone indices from scratch.
export function generateNeutralRamp(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const neutral = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, 8));
  return {
    light: {
      background: tone(neutral, 99),
      foreground: tone(neutral, 10),
      border: tone(neutral, 90),
      surface: tone(neutral, 98),
      surfaceText: tone(neutral, 10),
      surfaceHover: tone(neutral, 94),
      surfaceActive: tone(neutral, 10),
      surfaceActiveText: tone(neutral, 99),
    },
    dark: {
      background: tone(neutral, 11),
      foreground: tone(neutral, 92),
      border: tone(neutral, 22),
      surface: tone(neutral, 32),
      surfaceText: tone(neutral, 99),
      surfaceHover: tone(neutral, 38),
      surfaceActive: tone(neutral, 99),
      surfaceActiveText: tone(neutral, 13),
    },
  };
}

export function generateAccentPair(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const accentPalette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
  return {
    accent: tone(accentPalette, 70),
    onAccent: tone(accentPalette, 10),
  };
}
