// Dependency-free className joiner. Deliberately not clsx/cva -- the project has no
// UI library installed yet and this is the only behavior any of the new /studio
// components need: join truthy class strings, skip everything else.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
