/**
 * Joins truthy class-name fragments into a single string.
 * Dependency-free stand-in for clsx — enough for our variant maps.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
