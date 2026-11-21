/**
 * Lightweight typed shared-state contracts for graph nodes.
 *
 * Contracts are intentionally JSON-compatible so they can be generated from
 * visual tooling. They are validated at node boundaries, not on every write.
 */

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value, expected) {
  if (!expected || expected === 'any') return true;
  const actual = typeOf(value);
  if (Array.isArray(expected)) return expected.includes(actual);
  return expected === 'object' ? actual === 'object' : actual === expected;
}

export class StateContract {
  constructor({ name = 'State', fields = {}, strict = false, validator = null, validate = null } = {}) {
    this.name = name;
    this.fields = { ...fields };
    this.strict = strict;
    // Keep the method named `validate`; a custom validator lives separately so
    // it cannot shadow the public API.
    this.customValidator = validator ?? validate;
  }

  validate(shared = {}, { phase = 'input', throwOnError = false } = {}) {
    const errors = [];
    const value = shared ?? {};

    for (const [key, spec] of Object.entries(this.fields)) {
      const fieldSpec = typeof spec === 'string' ? { type: spec } : spec ?? {};
      const present = Object.prototype.hasOwnProperty.call(value, key);
      const fieldValue = value[key];

      if (!present || fieldValue === undefined) {
        if (fieldSpec.required) errors.push(`${this.name}.${key} is required (${phase}).`);
        continue;
      }
      if (!matchesType(fieldValue, fieldSpec.type)) {
        errors.push(`${this.name}.${key} must be ${fieldSpec.type}, received ${typeOf(fieldValue)} (${phase}).`);
        continue;
      }
      if (fieldSpec.enum && !fieldSpec.enum.includes(fieldValue)) {
        errors.push(`${this.name}.${key} must be one of ${fieldSpec.enum.join(', ')} (${phase}).`);
      }
      if (typeof fieldSpec.validate === 'function') {
        const result = fieldSpec.validate(fieldValue, value);
        if (result === false) errors.push(`${this.name}.${key} failed validation (${phase}).`);
        if (typeof result === 'string') errors.push(`${this.name}.${key}: ${result} (${phase}).`);
      }
    }

    if (this.strict) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(this.fields, key)) {
          errors.push(`${this.name}.${key} is not declared in a strict contract (${phase}).`);
        }
      }
    }

    if (typeof this.customValidator === 'function') {
      const result = this.customValidator(value, { phase });
      if (Array.isArray(result)) errors.push(...result);
      else if (result === false) errors.push(`${this.name} failed validation (${phase}).`);
      else if (typeof result === 'string') errors.push(`${this.name}: ${result} (${phase}).`);
    }

    if (throwOnError && errors.length) {
      const error = new Error(errors.join('; '));
      error.name = 'StateContractError';
      error.errors = errors;
      throw error;
    }

    return { valid: errors.length === 0, errors };
  }

  assert(shared, options = {}) {
    return this.validate(shared, { ...options, throwOnError: true });
  }
}

export function defineState(spec) {
  return new StateContract(spec);
}

export function validateState(shared, contract, options = {}) {
  if (!contract) return { valid: true, errors: [] };
  if (typeof contract.validate === 'function' && contract instanceof StateContract) {
    return contract.validate(shared, options);
  }
  return new StateContract(contract).validate(shared, options);
}

export function assertState(shared, contract, options = {}) {
  if (!contract) return { valid: true, errors: [] };
  if (typeof contract.assert === 'function') return contract.assert(shared, options);
  return new StateContract(contract).assert(shared, options);
}
