import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

export function normalizeColor(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const parsed = colord(trimmed);
  if (!parsed.isValid()) return null;
  return parsed.toHex().toLowerCase();
}
