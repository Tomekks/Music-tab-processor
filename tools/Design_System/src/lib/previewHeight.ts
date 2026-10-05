const PREVIEW_ORIGIN = "http://localhost:3000";

export function readPreviewHeight(
  origin: string,
  source: unknown,
  iframeWindow: unknown,
  data: unknown,
): number | null {
  if (origin !== PREVIEW_ORIGIN) return null;
  if (source === null || source === undefined || source !== iframeWindow) return null;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const message = data as Record<string, unknown>;
  if (message["type"] !== "preview-height") return null;
  const height = message["height"];
  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) return null;
  return height;
}
