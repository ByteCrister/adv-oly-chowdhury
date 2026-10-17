/**
 * Search parameter sanitization and MongoDB regex query helpers.
 *
 * Provides safe sanitization of user-supplied query parameters to prevent:
 * - Regular Expression Denial of Service (ReDoS)
 * - Regex syntax errors from unescaped metacharacters (e.g. `(`, `[`, `*`, `+`, `?`)
 * - Injection of invisible control characters or null bytes
 */

export interface SanitizeSearchOptions {
  /**
   * Maximum allowed character length for search query.
   * Longer strings will be safely truncated.
   * @default 100
   */
  maxLength?: number;
  /**
   * Whether to collapse multiple consecutive whitespace characters into a single space.
   * @default true
   */
  collapseWhitespace?: boolean;
}

/**
 * Escapes characters that have special meaning in regular expressions.
 * Ensures user search input can be safely passed into `RegExp` or MongoDB `$regex`.
 *
 * @param text The raw string to escape.
 * @returns Escaped string safe for regular expression usage.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sanitizes a search parameter obtained from URL search params.
 *
 * - Trims leading and trailing whitespace
 * - Strips ASCII control characters (0x00-0x1F) and delete (0x7F)
 * - Optionally collapses multiple spaces into a single space
 * - Truncates query to `maxLength` to protect server performance
 *
 * @param value The raw query parameter string, null, or undefined.
 * @param options Configuration options for sanitization.
 * @returns The sanitized non-empty search string, or `undefined` if empty/invalid.
 */
export function sanitizeSearchParam(
  value: string | null | undefined,
  options: SanitizeSearchOptions = {}
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const { maxLength = 100, collapseWhitespace = true } = options;

  // Remove control characters (including null bytes)
  let cleaned = String(value).replace(/[\x00-\x1F\x7F]/g, "");

  if (collapseWhitespace) {
    cleaned = cleaned.replace(/\s+/g, " ");
  }

  cleaned = cleaned.trim();

  if (!cleaned) {
    return undefined;
  }

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim();
  }

  return cleaned || undefined;
}

/**
 * Structure of a MongoDB regex filter.
 */
export interface MongoRegexQuery {
  $regex: string;
  $options: string;
}

/**
 * Builds a safe MongoDB `$regex` condition object from a raw search parameter.
 * Sanitizes and escapes the input so it can be passed directly to Mongoose queries.
 *
 * @param value The raw search string or parameter.
 * @param options Additional options (caseInsensitive flag, max length).
 * @returns A `{ $regex, $options }` object, or `null` if the sanitized search is empty.
 *
 * @example
 * ```ts
 * const searchRegex = buildSearchRegex(searchParams.get("search"));
 * if (searchRegex) {
 *   filter.$or = [
 *     { name: searchRegex },
 *     { email: searchRegex },
 *   ];
 * }
 * ```
 */
export function buildSearchRegex(
  value: string | null | undefined,
  options: SanitizeSearchOptions & { caseInsensitive?: boolean } = {}
): MongoRegexQuery | null {
  const sanitized = sanitizeSearchParam(value, options);
  if (!sanitized) {
    return null;
  }

  const flags = options.caseInsensitive !== false ? "i" : "";
  return {
    $regex: escapeRegex(sanitized),
    $options: flags,
  };
}

/**
 * Convenience helper to build a MongoDB `$or` array for multiple fields.
 *
 * @param value The raw search string or parameter.
 * @param fields The document field names to match against.
 * @param options Additional options.
 * @returns An array of `{ [field]: searchRegex }`, or `null` if search is empty.
 *
 * @example
 * ```ts
 * const searchFilter = buildSearchFilter(searchParams.get("search"), ["name", "email", "phone"]);
 * if (searchFilter) {
 *   filter.$or = searchFilter;
 * }
 * ```
 */
export function buildSearchFilter(
  value: string | null | undefined,
  fields: string[],
  options: SanitizeSearchOptions & { caseInsensitive?: boolean } = {}
): Array<Record<string, MongoRegexQuery>> | null {
  const regexQuery = buildSearchRegex(value, options);
  if (!regexQuery || fields.length === 0) {
    return null;
  }

  return fields.map((field) => ({
    [field]: regexQuery,
  }));
}
