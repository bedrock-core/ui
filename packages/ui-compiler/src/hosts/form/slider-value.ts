import type { Binding, Control } from '../../jsonui';
import type { SliderValueRange } from '../../nodes/primitives/slider';

const decimalPlaces = (value: number): number => {
  const [coefficient = '', exponent = '0'] = String(value).split('e');

  return Math.max(0, (coefficient.split('.')[1] ?? '').length - Number(exponent));
};

/** Caption properties are typed before the lazy screen's collection data arrives. */
export function sliderValueControl(range: SliderValueRange): Control {
  const bindings = sliderValueBindings(range);
  const strings = new Set(['#shown']);

  return {
    property_bag: { '#raw': '', ...Object.fromEntries(bindings.flatMap(binding =>
      binding.target_property_name === undefined
        ? []
        : [[binding.target_property_name,
            strings.has(binding.target_property_name) ? '' : 0]])) },
    bindings,
  };
}

/** Formats native integer stops in authored units without converting a float to text. */
export function sliderValueBindings({ min, max, step }: SliderValueRange): Binding[] {
  const precision = Math.max(...[min, max, step].map(decimalPlaces));
  const factor = 10 ** precision;
  const origin = Math.round(min * factor);
  const stride = Math.round(step * factor);
  const ceiling = Math.round(max * factor);

  if (![origin, stride, ceiling].every(Number.isSafeInteger)) {
    throw new Error('Slider range exceeds exact decimal precision.');
  }

  const bindings: Binding[] = [
    { binding_name: '#custom_slider_text', binding_type: 'collection', binding_collection_name: 'custom_form', binding_name_override: '#raw', binding_condition: 'always' },
  ];

  const view = (source: string, target: string): void => {
    bindings.push({ binding_type: 'view', source_property_name: source, target_property_name: target, binding_condition: 'always' });
  };

  const integer = (condition: string): string => `((1 + ${condition}) - 1)`;

  view('(0 + (#raw - (\'%.175s\' * #raw) - \': \'))', '#native');
  view(`((#native * ${stride}) ${origin < 0 ? '-' : '+'} ${Math.abs(origin)})`, '#unbounded');
  // Materialize comparison results before using them in native integer arithmetic.
  view(integer(`(#unbounded > ${ceiling})`), '#above_max');
  view(`(#above_max * (#unbounded - ${ceiling}))`, '#overflow');
  view('(#unbounded - #overflow)', '#scaled');
  view(integer('(#scaled < 0)'), '#negative');
  view('(#scaled * (1 - (2 * #negative)))', '#magnitude');

  const quotient = (target: string, input: string, divisor: number, bound: number): void => {
    let previous = '0';

    for (let bit = 2 ** Math.floor(Math.log2(Math.max(1, bound))); bit >= 1; bit /= 2) {
      const gate = `${target}_gate_${bit}`;
      const next = bit === 1 ? target : `${target}_${bit}`;
      const threshold = previous === '0' ? String(bit * divisor) : `((${previous} + ${bit}) * ${divisor})`;

      view(integer(`(not (${input} < ${threshold}))`), gate);
      view(`(${previous} + (${gate} * ${bit}))`, next);
      previous = next;
    }
  };

  // Bounded binary quotients keep every displayed digit an integer.
  quotient('#whole', '#magnitude', factor, Math.floor(Math.max(Math.abs(min), Math.abs(max))));
  view(`(#magnitude - (#whole * ${factor}))`, '#remaining_0');
  const digits: string[] = [];

  for (let digit = 0; digit < precision; digit++) {
    const place = 10 ** (precision - digit - 1);
    const name = `#digit_${digit}`;

    quotient(name, `#remaining_${digit}`, place, 9);
    view(`(#remaining_${digit} - (${name} * ${place}))`, `#remaining_${digit + 1}`);
    digits.push(name);
  }

  // A reset prefix keeps decimal output typed as text in the native expression reader.
  view(`(('§rvalue-' + #negative + 'x' + #whole${digits.length > 0 ? ' + \'.\' + ' + digits.join(' + ') : ''}) - 'value-0x' - 'value-falsex' - 'value' - '1x' - 'truex')`, '#shown');

  return bindings;
}
