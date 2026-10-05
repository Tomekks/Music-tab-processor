export interface PickerAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PickerSize {
  width: number;
  height: number;
}

export interface PickerPoint {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function pickerPosition(
  swatch: PickerAnchor,
  popover: PickerSize,
  viewport: PickerSize,
  gap = 8,
): PickerPoint {
  let left = swatch.x + swatch.width + gap;
  if (left + popover.width > viewport.width) {
    left = swatch.x - popover.width - gap;
  }
  left = clamp(left, 0, Math.max(0, viewport.width - popover.width));
  const top = clamp(swatch.y, 0, Math.max(0, viewport.height - popover.height));
  return { left, top };
}
