import { BadRequestException } from '@nestjs/common';

export type SortDirection = 'ASC' | 'DESC';

export interface SortRule {
  field: string;
  direction: SortDirection;
}

export const ALLOWED_SORT_FIELDS: readonly string[] = [
  'startDate',
  'price',
  'capacity',
  'registeredCount',
  'title',
  'createdAt',
  'id',
] as const;

/**
 * Parses and validates multi-sort query parameters.
 * Supports:
 * - String format: "startDate:ASC,price:DESC"
 * - JSON array format: '[{"field":"startDate","direction":"ASC"}]'
 * - Single field fallback from query (sortBy, sortOrder)
 * Automatically appends 'id' as the deterministic unique tie-breaker if not already present.
 */
export function parseSortRules(
  sortParam?: string | SortRule[],
  fallbackField = 'startDate',
  fallbackDirection: SortDirection = 'ASC',
): SortRule[] {
  const rules: SortRule[] = [];

  if (Array.isArray(sortParam)) {
    for (const item of sortParam) {
      if (item && item.field) {
        rules.push({
          field: item.field,
          direction: String(item.direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
        });
      }
    }
  } else if (typeof sortParam === 'string' && sortParam.trim()) {
    const trimmed = sortParam.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseSortRules(parsed, fallbackField, fallbackDirection);
        }
      } catch {
        throw new BadRequestException('Invalid JSON format for sort parameter');
      }
    }

    // Comma-separated: "startDate:ASC,price:DESC"
    const segments = trimmed.split(',');
    for (const seg of segments) {
      const [field, dir] = seg.trim().split(':');
      if (field) {
        rules.push({
          field: field.trim(),
          direction: dir && dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
        });
      }
    }
  }

  // If no valid rules parsed, use fallback
  if (rules.length === 0) {
    rules.push({
      field: fallbackField,
      direction: fallbackDirection,
    });
  }

  // Validate all fields against ALLOWED_SORT_FIELDS
  for (const rule of rules) {
    if (!ALLOWED_SORT_FIELDS.includes(rule.field)) {
      throw new BadRequestException(
        `Field '${rule.field}' is not allowed for sorting. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}`,
      );
    }
  }

  // Append ID tie-breaker if not explicitly the last sort rule
  const hasId = rules.some((r) => r.field === 'id');
  if (!hasId) {
    // Match the primary sort direction or default ASC for tie-breaker
    const tieDirection = rules[0]?.direction || 'ASC';
    rules.push({ field: 'id', direction: tieDirection });
  }

  return rules;
}
