const ALLOWED_ORIGINS = new Set(["http://localhost:5174", "http://127.0.0.1:5174"]);

const KEY_PATTERN = /^--[a-z0-9-]+$/;
const BAD_VALUE_PATTERN = /[;{}<\n\r]/;
const MAX_VALUE_LENGTH = 100;

export function readTokenMessage(origin: string, data: unknown): Record<string, string> | null {
  if (!ALLOWED_ORIGINS.has(origin)) return null;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const message = data as Record<string, unknown>;
  if (message["type"] !== "tokens") return null;
  const vars = message["vars"];
  if (typeof vars !== "object" || vars === null || Array.isArray(vars)) return null;
  for (const [key, value] of Object.entries(vars)) {
    if (!KEY_PATTERN.test(key)) return null;
    if (typeof value !== "string") return null;
    if (value.length > MAX_VALUE_LENGTH) return null;
    if (BAD_VALUE_PATTERN.test(value)) return null;
  }
  return { ...(vars as Record<string, string>) };
}

export function previewFitScale(frameWidth: number, contentWidth: number): number {
  if (!Number.isFinite(frameWidth) || frameWidth <= 0) return 1;
  if (!Number.isFinite(contentWidth) || contentWidth <= 0) return 1;
  if (frameWidth >= contentWidth) return 1;
  return frameWidth / contentWidth;
}

export function forcedStateSelector(selector: string): string | null {
  // A comma only separates selectors when it is not escaped (`\,` is part of a class name).
  if (/(^|[^\\]),/.test(selector)) return null;
  if (selector.includes(":hover")) {
    return `.force-hover ${selector.split(":hover").join("")}`;
  }
  if (selector.includes(":active")) {
    return `.force-active ${selector.split(":active").join("")}`;
  }
  return null;
}
