import { z } from 'zod';

export const jsonString = z.string().refine(
  (val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid JSON' }
);

function isJsonSerializable(val: unknown): boolean {
  try {
    JSON.stringify(val);
    return true;
  } catch {
    return false;
  }
}

export const jsonValue = z.unknown().refine(isJsonSerializable, { message: 'Value must be JSON-serializable' });
