import { describe, it, expect } from 'vitest';
import {
  canonicalJson,
  ruleLookupHash,
  urlMatchesPattern,
  patternSpecificity,
} from '../../../app/utils/rule-hash';

describe('canonicalJson', () => {
  it('returns empty string for null', () => {
    expect(canonicalJson(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(canonicalJson(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(canonicalJson('')).toBe('');
  });

  it('normalizes JSON by re-serializing (removes whitespace)', () => {
    expect(canonicalJson('{ "b": 2, "a": 1 }')).toBe('{"b":2,"a":1}');
  });

  it('returns the original string when input is not valid JSON', () => {
    const invalid = 'not-json';
    expect(canonicalJson(invalid)).toBe(invalid);
  });

  it('handles nested objects', () => {
    expect(canonicalJson('{"a":{"b":1}}')).toBe('{"a":{"b":1}}');
  });

  it('handles arrays', () => {
    expect(canonicalJson('[1,2,3]')).toBe('[1,2,3]');
  });
});

describe('ruleLookupHash', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = ruleLookupHash('/users', 'GET', null);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for identical inputs', () => {
    const h1 = ruleLookupHash('/users', 'GET', null);
    const h2 = ruleLookupHash('/users', 'GET', null);
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different URLs', () => {
    const h1 = ruleLookupHash('/users', 'GET', null);
    const h2 = ruleLookupHash('/orders', 'GET', null);
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different methods', () => {
    const h1 = ruleLookupHash('/users', 'GET', null);
    const h2 = ruleLookupHash('/users', 'POST', null);
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different bodies', () => {
    const h1 = ruleLookupHash('/users', 'POST', '{"name":"a"}');
    const h2 = ruleLookupHash('/users', 'POST', '{"name":"b"}');
    expect(h1).not.toBe(h2);
  });

  it('produces the same hash for semantically equal JSON bodies (whitespace differences)', () => {
    const h1 = ruleLookupHash('/users', 'POST', '{"name":"alice"}');
    const h2 = ruleLookupHash('/users', 'POST', '{ "name": "alice" }');
    expect(h1).toBe(h2);
  });

  it('null and undefined body produce the same hash', () => {
    const h1 = ruleLookupHash('/users', 'GET', null);
    const h2 = ruleLookupHash('/users', 'GET', undefined);
    expect(h1).toBe(h2);
  });
});

describe('urlMatchesPattern', () => {
  it('matches exact paths', () => {
    expect(urlMatchesPattern('/users', '/users')).toBe(true);
  });

  it('does not match different exact paths', () => {
    expect(urlMatchesPattern('/users', '/orders')).toBe(false);
  });

  it('matches :param segments', () => {
    expect(urlMatchesPattern('/users/:id', '/users/123')).toBe(true);
  });

  it('matches wildcard * segments', () => {
    expect(urlMatchesPattern('/users/*', '/users/anything')).toBe(true);
  });

  it('does not match when segment counts differ', () => {
    expect(urlMatchesPattern('/users/:id', '/users/123/extra')).toBe(false);
  });

  it('ignores query strings in the path', () => {
    expect(urlMatchesPattern('/users/:id', '/users/123?foo=bar')).toBe(true);
  });

  it('matches nested param patterns', () => {
    expect(urlMatchesPattern('/users/:userId/posts/:postId', '/users/1/posts/2')).toBe(true);
  });

  it('does not match when a literal segment differs', () => {
    expect(urlMatchesPattern('/users/:id/posts', '/users/1/comments')).toBe(false);
  });

  it('matches root path', () => {
    expect(urlMatchesPattern('/', '/')).toBe(true);
  });
});

describe('patternSpecificity', () => {
  it('exact path has highest specificity (no wildcards)', () => {
    expect(patternSpecificity('/users/profile')).toBe(3);
  });

  it(':param reduces specificity', () => {
    expect(patternSpecificity('/users/:id')).toBe(2);
  });

  it('wildcard * reduces specificity', () => {
    expect(patternSpecificity('/users/*')).toBe(2);
  });

  it('more specific path beats less specific', () => {
    const specific = patternSpecificity('/users/:id');
    const generic = patternSpecificity('/*');
    expect(specific).toBeGreaterThan(generic);
  });

  it('all-wildcard pattern has lowest specificity', () => {
    expect(patternSpecificity('/*')).toBe(1);
  });
});
