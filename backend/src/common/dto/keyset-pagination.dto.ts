import { BadRequestException } from '@nestjs/common';

export interface KeysetPaginationMeta {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
  hasPrevPage: boolean;
  currentCursor: string | null;
}

export interface KeysetPaginatedResult<T> {
  items: T[];
  meta: KeysetPaginationMeta;
}

export interface DecodedCursor {
  values: any[];
}

/**
 * Encodes an array of field values (from the last item) into a safe base64url cursor string.
 */
export function encodeCursor(values: any[]): string {
  try {
    const json = JSON.stringify({ values });
    return Buffer.from(json, 'utf8').toString('base64url');
  } catch (err: any) {
    throw new BadRequestException('Failed to encode pagination cursor');
  }
}

/**
 * Decodes a base64url cursor into the array of field values.
 */
export function decodeCursor(cursor: string): any[] {
  if (!cursor || typeof cursor !== 'string') {
    throw new BadRequestException('Cursor must be a valid string');
  }
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.values)) {
      throw new BadRequestException('Invalid cursor payload structure');
    }
    return parsed.values;
  } catch (err: any) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('Malformed pagination cursor');
  }
}
