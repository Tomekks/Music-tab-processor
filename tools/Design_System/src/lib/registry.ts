export const COMPONENTS = [
  { slug: "button", name: "Button" },
  { slug: "color-field", name: "Color Field" },
  { slug: "icon-button", name: "Icon Button" },
  { slug: "segmented-control", name: "Segmented Control" },
  { slug: "slider", name: "Slider" }
];

export function findComponent(slug: string) {
  return COMPONENTS.find((entry) => entry.slug === slug);
}
