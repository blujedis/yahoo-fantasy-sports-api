
// Tries to parse JSON from string or 
// array of chunks.
export function tryParseJSON(chunks, def = {}) {
  const isArray = Array.isArray(chunks);
  const isString = typeof chunks === 'string';
  try {
    if (typeof chunks === 'string')
      return JSON.parse(chunks);
    if (Array.isArray(chunks))
      return JSON.parse(Buffer.concat(chunks));
    return def;
  }
  catch (err) {
    return def;
  }
}

export function toSearchParams(params = {}) {
  return (new URLSearchParams(params)).toString();
}