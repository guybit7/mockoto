import { describe, it, expect } from 'vitest';
import { safeParseJson, normalizeJson, serializeResponseBody, parseResponseBody } from '../../../app/utils/json';

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

describe('serializeResponseBody', () => {
  it('should store JSON values as JSON text', () => {
    expect(serializeResponseBody({ a: 1 }, undefined)).toBe('{"a":1}');
  });

  it('should JSON-quote a string when the content type is JSON or missing', () => {
    expect(serializeResponseBody('hello', undefined)).toBe('"hello"');
    expect(serializeResponseBody('hello', { 'content-type': 'application/json' })).toBe('"hello"');
  });

  it('should store a string verbatim for non-JSON content types', () => {
    expect(serializeResponseBody('hello', { 'content-type': 'text/plain' })).toBe('hello');
    expect(serializeResponseBody('<a/>', { 'Content-Type': 'application/xml; charset=utf-8' })).toBe('<a/>');
  });
});

describe('parseResponseBody', () => {
  it('should return undefined for an empty body', () => {
    expect(parseResponseBody(null, undefined)).toBeUndefined();
  });

  it('should parse JSON bodies, including +json types', () => {
    expect(parseResponseBody('{"a":1}', undefined)).toEqual({ a: 1 });
    expect(parseResponseBody('{"a":1}', { 'content-type': 'application/problem+json' })).toEqual({ a: 1 });
  });

  it('should return non-JSON bodies as the raw string', () => {
    expect(parseResponseBody('42', { 'content-type': 'text/plain' })).toBe('42');
  });
});
