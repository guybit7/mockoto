import { describe, it, expect } from 'vitest';
import { safeParseJson, normalizeJson } from '../../../app/utils/json';

describe('safeParseJson', () => {
  it('returns undefined for undefined', () => {
    expect(safeParseJson(undefined)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(safeParseJson(null)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(safeParseJson('')).toBeUndefined();
  });

  it('parses a valid JSON object', () => {
    expect(safeParseJson('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('parses a valid JSON array', () => {
    expect(safeParseJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('parses a valid JSON string', () => {
    expect(safeParseJson('"hello"')).toBe('hello');
  });

  it('parses a valid JSON number', () => {
    expect(safeParseJson('42')).toBe(42);
  });

  it('returns the raw string when JSON is invalid', () => {
    expect(safeParseJson('not-json')).toBe('not-json');
  });

  it('returns the raw string for truncated JSON', () => {
    expect(safeParseJson('{"key":')).toBe('{"key":');
  });
});

describe('normalizeJson', () => {
  it('serializes an object', () => {
    expect(normalizeJson({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('serializes an array', () => {
    expect(normalizeJson([1, 2, 3])).toBe('[1,2,3]');
  });

  it('serializes null', () => {
    expect(normalizeJson(null)).toBe('null');
  });

  it('serializes a string', () => {
    expect(normalizeJson('hello')).toBe('"hello"');
  });

  it('serializes a number', () => {
    expect(normalizeJson(42)).toBe('42');
  });
});
