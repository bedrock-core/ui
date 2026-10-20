import { describe, expect, it } from 'vitest';
import { sliderValueBindings } from '../slider-value';

type Scalar = string | number | boolean;

/** Evaluates the arithmetic and string operations used by JSON UI captions. */
function evaluate(source: string, properties: Record<string, Scalar>): Scalar {
  expect(source).not.toMatch(/>=|<=|==|!=/);
  const tokens = source.match(/'[^']*'|#[\w]+|\bnot\b|\d+(?:\.\d+)?(?:e[+-]?\d+)?|[()+*/<>=-]/g) ?? [];
  const precedence: Record<string, number> = { '>': 1, '<': 1, '=': 1, '+': 2, '-': 2, '*': 3, '/': 3 };
  let at = 0;
  const apply = (operator: string, left: Scalar, right: Scalar): Scalar => {
    if (operator === '+') {
      if (typeof left === 'string') {
        if (typeof right === 'number' && !Number.isInteger(right)) { throw new Error('A float cannot be concatenated into JSON UI text.'); }
        return left + String(right);
      }
      if (left === 0 && typeof right === 'boolean') { return right; }
      return Number(left) + Number(right);
    }
    if (operator === '-') { return typeof left === 'string' && typeof right === 'string' ? left.replaceAll(right, '') : Number(left) - Number(right); }
    if (operator === '*') {
      if (typeof left === 'string' && /^%\.\d+s$/.test(left)) { return Buffer.from(String(right)).subarray(0, Number(left.slice(2, -1))).toString('utf8'); }
      return Number(left) * Number(right);
    }
    if (operator === '/') { return Number(left) / Number(right); }
    if (operator === '>') { return Number(left) > Number(right); }
    if (operator === '<') { return Number(left) < Number(right); }
    if (operator === '=') { return left === right; }
    throw new Error('Unsupported operator: ' + operator);
  };
  const atom = (): Scalar => {
    const token = tokens[at++];
    if (token === '(') {
      const start = at;
      const result = expression(0);
      expect(tokens.slice(start, at).some(value => value.startsWith('#')), 'Native binding groups require a source property.').toBe(true);
      expect(tokens[at++]).toBe(')');
      return result;
    }
    if (token === '-') { return -Number(atom()); }
    if (token === 'not') { return !atom(); }
    if (token?.startsWith("'")) { return token.slice(1, -1); }
    if (token?.startsWith('#')) { return properties[token] ?? 0; }
    return Number(token);
  };
  const expression = (minimum: number): Scalar => {
    let left = atom();
    while ((precedence[tokens[at] ?? ''] ?? -1) >= minimum) {
      const operator = tokens[at++]!;
      left = apply(operator, left, expression(precedence[operator]! + 1));
    }
    return left;
  };
  const result = expression(0);
  expect(at).toBe(tokens.length);
  return result;
}

describe('authored slider captions', () => {
  it.each([
    { min: 0, max: 1, step: 0.01, stop: 5, text: '0.05' },
    { min: 0, max: 1, step: 0.01, stop: 52, text: '0.52' },
    { min: 0, max: 1, step: 0.01, stop: 100, text: '1.00' },
    { min: -0.75, max: 1.25, step: 0.25, stop: 1, text: '-0.50' },
    { min: 0.5, max: 2.5, step: 1, stop: 1, text: '1.5' },
    { min: -0.75, max: 1.25, step: 1, stop: 1, text: '0.25' },
    { min: 0.125, max: 1.125, step: 0.5, stop: 1, text: '0.625' },
    { min: 0.05, max: 0.45, step: 0.2, stop: 1, text: '0.25' },
    { min: 0, max: 1e-6, step: 1e-7, stop: 3, text: '0.0000003' },
    { min: 1.2e-7, max: 1.12e-6, step: 1e-7, stop: 1, text: '0.00000022' },
    { min: 0, max: 0.35, step: 0.2, stop: 2, text: '0.35' },
    { min: 0.05, max: 123456.05, step: 0.01, stop: 12345600, text: '123456.05' },
  ])('renders $text from stop $stop in [$min, $max]', ({ stop, text, ...range }) => {
    const properties: Record<string, Scalar> = { '#raw': 'x'.repeat(175) + ': ' + stop };
    const bindings = sliderValueBindings(range);
    for (const binding of bindings) {
      if (binding.source_property_name && binding.target_property_name) {
        properties[binding.target_property_name] = evaluate(binding.source_property_name, properties);
      }
    }
    expect(properties['#shown']).toBe('§r' + text);
    expect(bindings.length).toBeLessThan(100);
  });

  it('rejects decimal ranges beyond exact integer precision', () => {
    expect(() => sliderValueBindings({ min: 0.01, max: 1e20, step: 0.01 })).toThrow(/exact decimal precision/);
  });
});
