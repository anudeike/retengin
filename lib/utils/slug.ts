/**
 * Generates a URL-safe slug from a business name.
 * e.g. "Joe's Coffee & Bagels" → "joes-coffee-and-bagels"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
}

/** Returns true if the string is a valid Taplo slug. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug)
}
