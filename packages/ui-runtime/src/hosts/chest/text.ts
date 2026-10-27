/** Maximum UTF-16 length of a container text value. */
export const CONTAINER_TEXT_LIMIT = 128;

/** Resets the native custom-name style before the payload. */
export const TEXT_NAME_PREFIX = '\u00a7r';

/** Bounds a live value without cutting a surrogate pair in half. */
export const boundedText = (value: string, length: number): string => {
  const result = value.slice(0, Math.min(CONTAINER_TEXT_LIMIT, Math.max(0, Math.floor(length))));

  return /[\uD800-\uDBFF]$/.test(result) ? result.slice(0, -1) : result;
};

/** Current durability identifying an empty text value. */
export const TEXT_EMPTY_VALUE = 1;
