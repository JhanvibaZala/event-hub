import { BadRequestException } from '@nestjs/common';

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between';

export type FilterField =
  | 'title'
  | 'location'
  | 'price'
  | 'capacity'
  | 'registeredCount'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'categoryId'
  | 'isOnline';

export interface FilterRule {
  field: FilterField;
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  logic?: 'AND' | 'OR';
  rules?: FilterRule[];
  groups?: FilterGroup[];
}

export const ALLOWED_FILTER_FIELDS: readonly FilterField[] = [
  'title',
  'location',
  'price',
  'capacity',
  'registeredCount',
  'startDate',
  'endDate',
  'status',
  'categoryId',
  'isOnline',
] as const;

export const ALLOWED_FILTER_OPERATORS: readonly FilterOperator[] = [
  'equals',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
] as const;

export const FIELD_TYPE_MAP: Record<
  FilterField,
  'string' | 'number' | 'date' | 'boolean' | 'enum' | 'uuid'
> = {
  title: 'string',
  location: 'string',
  price: 'number',
  capacity: 'number',
  registeredCount: 'number',
  startDate: 'date',
  endDate: 'date',
  status: 'enum',
  categoryId: 'uuid',
  isOnline: 'boolean',
};

export const ALLOWED_OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  string: ['equals', 'contains'],
  number: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  date: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  boolean: ['equals'],
  enum: ['equals'],
  uuid: ['equals'],
};

/**
 * Validates a filter group recursively against allowlists.
 */
export function validateFilterGroup(group: FilterGroup): void {
  const logic = group.logic || 'AND';
  if (logic !== 'AND' && logic !== 'OR') {
    throw new BadRequestException(`Invalid filter logic '${logic}'. Allowed: 'AND', 'OR'`);
  }

  if (group.rules && Array.isArray(group.rules)) {
    for (const rule of group.rules) {
      validateFilterRule(rule);
    }
  }

  if (group.groups && Array.isArray(group.groups)) {
    for (const subGroup of group.groups) {
      validateFilterGroup(subGroup);
    }
  }
}

/**
 * Validates a single filter rule against field and operator allowlists.
 */
export function validateFilterRule(rule: FilterRule): void {
  if (!rule || typeof rule !== 'object') {
    throw new BadRequestException('Filter rule must be an object');
  }

  if (!ALLOWED_FILTER_FIELDS.includes(rule.field)) {
    throw new BadRequestException(
      `Field '${rule.field}' is not allowed for filtering. Allowed: ${ALLOWED_FILTER_FIELDS.join(', ')}`,
    );
  }

  if (!ALLOWED_FILTER_OPERATORS.includes(rule.operator)) {
    throw new BadRequestException(
      `Operator '${rule.operator}' is not allowed. Allowed: ${ALLOWED_FILTER_OPERATORS.join(', ')}`,
    );
  }

  const expectedType = FIELD_TYPE_MAP[rule.field];
  const allowedOps = ALLOWED_OPERATORS_BY_TYPE[expectedType];
  if (!allowedOps.includes(rule.operator)) {
    throw new BadRequestException(
      `Operator '${rule.operator}' is not valid for field '${rule.field}' of type '${expectedType}'. Allowed: ${allowedOps.join(', ')}`,
    );
  }

  if (rule.operator === 'between') {
    if (!Array.isArray(rule.value) || rule.value.length !== 2) {
      throw new BadRequestException(
        `Operator 'between' for field '${rule.field}' requires an array of 2 values [min, max]`,
      );
    }
  } else if (rule.value === undefined || rule.value === null || rule.value === '') {
    throw new BadRequestException(
      `Filter value for field '${rule.field}' cannot be empty`,
    );
  }
}
