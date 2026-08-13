function finite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}

function cleanNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.round((value + Number.EPSILON) * 1e12) / 1e12;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function quantity(value, unit) {
  const surface = cleanNumber(value);
  if (!unit) return surface;
  const normalized = unit.toLocaleLowerCase('en-US');
  if (['ron', 'lei'].includes(normalized)) return `${surface} RON`;
  if (['eur', 'euro', 'euros'].includes(normalized)) return `${surface} EUR`;
  if (['usd', 'dollar', 'dollars'].includes(normalized)) return `${surface} USD`;
  return `${surface} ${unit}`;
}

function arithmetic(frame) {
  const { left, right, operator } = frame.inputs;
  finite(left, 'Left operand');
  finite(right, 'Right operand');
  const operation = ({ '+': 'add', '-': 'subtract', '\u2212': 'subtract', '\u00d7': 'multiply', x: 'multiply',
    '*': 'multiply', '\u00f7': 'divide', '/': 'divide', plus: 'add', minus: 'subtract', times: 'multiply',
    'multiplied by': 'multiply', 'divided by': 'divide' })[operator];
  if (!operation) return undefined;
  if (operation === 'divide' && right === 0) return {
    status: 'UNDERDETERMINED', answer: 'Division by zero is undefined.', values: [],
    gap: 'division-by-zero', witness: { operation, left, right },
  };
  const value = operation === 'add' ? left + right : operation === 'subtract' ? left - right
    : operation === 'multiply' ? left * right : left / right;
  return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
    witness: { operation, left, right, result: value } };
}

function execute(frame) {
  const { operation, inputs } = frame;
  if (operation === 'scalar-arithmetic') return arithmetic(frame);
  if (operation === 'percentage-of') {
    const value = finite(inputs.base, 'Percentage base') * finite(inputs.percentage, 'Percentage') / 100;
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { equation: 'base * percentage / 100', ...inputs, result: value } };
  }
  if (operation === 'percentage-increase') {
    const value = finite(inputs.base, 'Increase base') * (1 + finite(inputs.percentage, 'Percentage') / 100);
    return { status: 'SOLVED', answer: quantity(value, inputs.unit), values: [value],
      witness: { equation: 'base * (1 + percentage / 100)', ...inputs, result: value } };
  }
  if (operation === 'integer-parity') {
    const value = finite(inputs.value, 'Parity value');
    if (!Number.isInteger(value)) return undefined;
    const answer = value % 2 === 0 ? 'yes' : 'no';
    return { status: 'SOLVED', answer, values: [answer],
      witness: { equation: 'value modulo 2', value, remainder: Math.abs(value % 2) } };
  }
  if (operation === 'arithmetic-sequence-next') {
    const values = inputs.values.map((value) => finite(value, 'Sequence value'));
    const differences = values.slice(1).map((value, index) => value - values[index]);
    if (differences.length === 0 || !differences.every((value) => value === differences[0])) return undefined;
    const value = values.at(-1) + differences[0];
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { rule: 'constant-difference', values, difference: differences[0], result: value } };
  }
  if (operation === 'proportional-scale') {
    if (inputs.first === 0) return undefined;
    const scale = inputs.scaledFirst / inputs.first;
    const value = inputs.second * scale;
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { equation: 'second * scaledFirst / first', ...inputs, scale, result: value } };
  }
  if (operation === 'unit-conversion') {
    const value = inputs.value * inputs.factor;
    const unit = `${inputs.to}${value === 1 ? '' : 's'}`;
    return { status: 'SOLVED', answer: quantity(value, unit), values: [value],
      witness: { equation: 'value * factor', ...inputs, result: value } };
  }
  if (operation === 'clock-duration') {
    if (inputs.hour > 23 || inputs.minute > 59) return undefined;
    const totalMinutes = inputs.hour * 60 + inputs.minute + inputs.durationHours * 60;
    if (!Number.isInteger(totalMinutes)) return undefined;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const answer = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { status: 'SOLVED', answer, values: [answer],
      witness: { equation: 'start minutes + duration minutes modulo one day', ...inputs, totalMinutes } };
  }
  if (operation === 'equal-group-total') {
    const value = inputs.groups * inputs.perGroup;
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { equation: 'groups * items per group', ...inputs, result: value } };
  }
  if (operation === 'remaining-quantity') {
    const value = inputs.total - inputs.consumed;
    if (value < 0) return undefined;
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { equation: 'total - consumed', ...inputs, result: value } };
  }
  if (operation === 'arithmetic-mean') {
    const sum = inputs.values.reduce((total, value) => total + finite(value, 'Mean value'), 0);
    const raw = sum / inputs.values.length;
    const value = Math.round((raw + Number.EPSILON) * (10 ** inputs.precision)) / (10 ** inputs.precision);
    return { status: 'SOLVED', answer: cleanNumber(value), values: [value],
      witness: { equation: 'sum(values) / count(values)', values: inputs.values, sum, result: value,
        rounding: `nearest ${inputs.precision} decimal places` } };
  }
  if (operation === 'ordered-relation-extreme') {
    const value = inputs.requestedExtreme === 'minimum' ? inputs.chain.at(-1) : inputs.chain[0];
    return { status: 'SOLVED', answer: value, values: [value],
      witness: { rule: 'transitive-strict-order', relation: inputs.relation, chain: inputs.chain,
        requestedExtreme: inputs.requestedExtreme, result: value } };
  }
  return undefined;
}

export function executeDeterministicValueOperation(frame) {
  if (!frame || frame.format !== 'eslm-bounded-operation-frame') {
    throw new TypeError('Deterministic value execution requires a bounded operation frame.');
  }
  return execute(frame);
}
