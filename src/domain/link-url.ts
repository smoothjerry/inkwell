/** Link addresses (DESIGN_SPEC §7.3). Pure functions. */

/**
 * The address a typed link points to. One without a scheme (`example.com`)
 * gets `https://`; an empty one stays empty, which removes the link.
 */
export function normalizeUrl(value: string): string {
  const url = value.trim();
  return url === "" || /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}
