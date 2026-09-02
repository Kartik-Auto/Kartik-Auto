/**
 * Redact volatile API fields so toMatchSnapshot() can assert shape, not faker data.
 * Stage and UAT should each keep their own snapshot file.
 */

const VOLATILE_KEY =
  /(^id$|uuid|token|guid|created|updated|deleted|timestamp|phone|email|jersey|name|number|address)/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T\s]|$)/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function redactApiBody(body: unknown, replacements: string[] = []): unknown {
  const tokens = replacements.filter(Boolean);

  const redact = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number') return '<number>';
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (tokens.some((token) => value.includes(token))) return '<string>';
      if (ISO_DATE.test(value)) return '<iso-date>';
      if (UUID.test(value)) return '<uuid>';
      if (value.includes('@')) return '<email>';
      return value;
    }
    if (Array.isArray(value)) return value.map(redact);
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
          if (VOLATILE_KEY.test(key) && (typeof nested !== 'object' || nested === null)) {
            if (typeof nested === 'number') return [key, '<number>'];
            if (typeof nested === 'boolean') return [key, nested];
            if (nested === null || nested === undefined) return [key, nested];
            return [key, '<string>'];
          }
          return [key, redact(nested)];
        }),
      );
    }
    return value;
  };

  return redact(body);
}
