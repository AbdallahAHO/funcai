const WORD_SEPARATOR = /-([a-z])/g;

export function toCamelCase(kebab: string): string {
  return kebab.replace(WORD_SEPARATOR, (_, c: string) => c.toUpperCase());
}

export function toPascalCase(kebab: string): string {
  const camel = toCamelCase(kebab);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
