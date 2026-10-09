import { ellipsizeText, measureText, type TextFont } from '@bedrock-core/ui-runtime';

/** A single caption line, with an ellipsis when its allotted width cannot hold it. */
export function fitCaption(text: string, width: number | undefined, font: TextFont, scale: number): string {
  const line = text.split('\n')[0] ?? '';

  if (width === undefined) { return line; }

  if (width <= 0) { return ''; }

  if (measureText({ text: line, font, fontSize: scale }).width <= width) { return line; }

  if (measureText({ text: '...', font, fontSize: scale }).width > width) { return ''; }

  return ellipsizeText(line, width, font, scale);
}
