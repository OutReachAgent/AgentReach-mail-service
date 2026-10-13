import { timingSafeEqual } from 'node:crypto';

export function hasValidInternalSecret(
  configured: string | undefined,
  supplied: string | undefined,
) {
  if (!configured || !supplied) return false;

  const expected = Buffer.from(configured, 'utf8');
  const actual = Buffer.from(supplied, 'utf8');
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

