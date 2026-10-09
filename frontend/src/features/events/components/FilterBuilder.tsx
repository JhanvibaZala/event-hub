import React from 'react';
import {
  FilterRule,
  FilterGroup,
  FilterField,
  FilterOperator,
  Category,
} from '../eventsSlice';
import { Plus, Trash2, RotateCcw, Filter, FolderPlus } from 'lucide-react';

interface FilterBuilderProps {
  filterGroup: FilterGroup;
  onChange: (group: FilterGroup) => void;
  onApply: () => void;
  onReset: () => void;
  categories: Category[];
  isApplied: boolean;
}

const FIELD_DEFINITIONS: Array<{
  field: FilterField;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'uuid';
}> = [
  { field: 'title', label: 'Event Title', type: 'string' },
  { field: 'location', label: 'Location', type: 'string' },
  { field: 'categoryId', label: 'Category', type: 'uuid' },
  { field: 'price', label: 'Admission Price ($)', type: 'number' },
  { field: 'capacity', label: 'Total Capacity', type: 'number' },
  { field: 'registeredCount', label: 'Registered Count', type: 'number' },
  { field: 'startDate', label: 'Start Date', type: 'date' },
  { field: 'endDate', label: 'End Date', type: 'date' },
  { field: 'isOnline', label: 'Virtual / In-Person', type: 'boolean' },
  { field: 'status', label: 'Event Status', type: 'enum' },
];

const OPERATORS_BY_TYPE: Record<string, Array<{ operator: FilterOperator; label: string }>> = {
  string: [
    { operator: 'contains', label: 'contains' },
    { operator: 'equals', label: 'equals' },
  ],
  number: [
    { operator: 'equals', label: '=' },
    { operator: 'gt', label: '>' },
    { operator: 'gte', label: '>=' },
    { operator: 'lt', label: '<' },
    { operator: 'lte', label: '<=' },
    { operator: 'between', label: 'between [min, max]' },
  ],
  date: [
    { operator: 'equals', label: 'on date' },
    { operator: 'gte', label: 'on or after' },
    { operator: 'lte', label: 'on or before' },
    { operator: 'between', label: 'between dates' },
  ],
  boolean: [{ operator: 'equals', label: 'is' }],
  enum: [{ operator: 'equals', label: 'is' }],
  uuid: [{ operator: 'equals', label: 'is' }],
};

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filterGroup,
  onChange,
  onApply,
  onReset,
  categories,
  isApplied,
}) => {
  const getFieldType = (field: FilterField) => {
    const def = FIELD_DEFINITIONS.find((f) => f.field === field);
    return def ? def.type : 'string';
  };

  const getDefaultValueForField = (field: FilterField, operator: FilterOperator) => {
    if (operator === 'between') {
      if (field === 'startDate' || field === 'endDate') {
        return ['', ''];
      }
      return [0, 100];
    }
    const type = getFieldType(field);
    if (type === 'number') return 0;
    if (type === 'boolean') return 'true';
    if (type === 'uuid') return categories[0]?.id || '';
    if (type === 'enum') return 'PUBLISHED';
    return '';
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({ ...filterGroup, logic });
  };

  const handleAddRule = () => {
    const defaultField: FilterField = 'title';
    const defaultOp: FilterOperator = 'contains';
    const newRule: FilterRule = {
      field: defaultField,
      operator: defaultOp,
      value: '',
    };
    const rules = [...(filterGroup.rules || []), newRule];
    onChange({ ...filterGroup, rules });
  };

  const handleAddGroup = () => {
    const newGroup: FilterGroup = {
      logic: 'AND',
      rules: [
        {
          field: 'price',
          operator: 'lte',
          value: 50,
        },
      ],
      groups: [],
    };
    const groups = [...(filterGroup.groups || []), newGroup];
    onChange({ ...filterGroup, groups });
  };

  const handleRuleFieldChange = (index: number, newField: FilterField) => {
    const type = getFieldType(newField);
    const availableOps = OPERATORS_BY_TYPE[type];
    const newOp = availableOps[0].operator;
    const newVal = getDefaultValueForField(newField, newOp);

    const rules = [...(filterGroup.rules || [])];
    rules[index] = {
      field: newField,
      operator: newOp,
      value: newVal,
    };
    onChange({ ...filterGroup, rules });
  };

  const handleRuleOperatorChange = (index: number, newOp: FilterOperator) => {
    const rules = [...(filterGroup.rules || [])];
    const curRule = rules[index];
    let newVal = curRule.value;

    if (newOp === 'between' && !Array.isArray(newVal)) {
      newVal = curRule.field.includes('Date') ? ['', ''] : [0, 100];
    } else if (newOp !== 'between' && Array.isArray(newVal)) {
      newVal = newVal[0] || '';
    }

    rules[index] = {
      ...curRule,
      operator: newOp,
      value: newVal,
    };
    onChange({ ...filterGroup, rules });
  };

  const handleRuleValueChange = (index: number, val: any) => {
    const rules = [...(filterGroup.rules || [])];
    rules[index] = {
      ...rules[index],
      value: val,
    };
    onChange({ ...filterGroup, rules });
  };

  const handleRemoveRule = (index: number) => {
    const rules = [...(filterGroup.rules || [])];
    rules.splice(index, 1);
    onChange({ ...filterGroup, rules });
  };

  const handleRemoveSubGroup = (index: number) => {
    const groups = [...(filterGroup.groups || [])];
    groups.splice(index, 1);
    onChange({ ...filterGroup, groups });
  };

  const handleSubGroupChange = (index: number, updatedSubGroup: FilterGroup) => {
    const groups = [...(filterGroup.groups || [])];
    groups[index] = updatedSubGroup;
    onChange({ ...filterGroup, groups });
  };

  const totalRules =
    (filterGroup.rules?.length || 0) +
    (filterGroup.groups?.reduce((acc, g) => acc + (g.rules?.length || 0), 0) || 0);

  const renderValueInput = (rule: FilterRule, onValChange: (v: any) => void) => {
    const type = getFieldType(rule.field);

    if (rule.operator === 'between') {
      const arrVal = Array.isArray(rule.value) ? rule.value : ['', ''];
      const inputType = type === 'date' ? 'date' : 'number';
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <input
            type={inputType}
            className="filter-input"
            style={{ width: inputType === 'date' ? '140px' : '90px' }}
            placeholder="Min"
            value={arrVal[0] ?? ''}
            onChange={(e) =>
              onValChange([
                inputType === 'number' ? Number(e.target.value) : e.target.value,
                arrVal[1],
              ])
            }
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
          <input
            type={inputType}
            className="filter-input"
            style={{ width: inputType === 'date' ? '140px' : '90px' }}
            placeholder="Max"
            value={arrVal[1] ?? ''}
            onChange={(e) =>
              onValChange([
                arrVal[0],
                inputType === 'number' ? Number(e.target.value) : e.target.value,
              ])
            }
          />
        </div>
      );
    }

    if (rule.field === 'categoryId') {
      return (
        <select
          className="filter-select"
          style={{ minWidth: '160px' }}
          value={rule.value || ''}
          onChange={(e) => onValChange(e.target.value)}
        >
          <option value="">Select Category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }

    if (rule.field === 'isOnline') {
      return (
        <select
          className="filter-select"
          value={String(rule.value)}
          onChange={(e) => onValChange(e.target.value === 'true')}
        >
          <option value="true">Virtual / Online Event</option>
          <option value="false">In-Person Venue</option>
        </select>
      );
    }

    if (rule.field === 'status') {
      return (
        <select
          className="filter-select"
          value={rule.value || 'PUBLISHED'}
          onChange={(e) => onValChange(e.target.value)}
        >
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      );
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          className="filter-input"
          placeholder="Number value"
          value={rule.value ?? ''}
          onChange={(e) => onValChange(Number(e.target.value))}
        />
      );
    }

    if (type === 'date') {
      return (
        <input
          type="date"
          className="filter-input"
          value={rule.value || ''}
          onChange={(e) => onValChange(e.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        className="filter-input"
        placeholder="Filter text..."
        value={rule.value || ''}
        onChange={(e) => onValChange(e.target.value)}
      />
    );
  };

  return (
    <div className="filter-panel">
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Filter size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Filter Builder
          </span>
          {totalRules > 0 && (
            <span className="badge badge-primary">
              {totalRules} {totalRules === 1 ? 'Rule' : 'Rules'}
            </span>
          )}
          {isApplied && (
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              Active
            </span>
          )}
        </div>

        {/* Global Match Logic Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Match</span>
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${filterGroup.logic !== 'OR' ? 'active' : ''}`}
              onClick={() => handleLogicChange('AND')}
            >
              AND (All)
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${filterGroup.logic === 'OR' ? 'active' : ''}`}
              onClick={() => handleLogicChange('OR')}
            >
              OR (Any)
            </button>
          </div>
        </div>
      </div>

      {/* Rules list */}
      {(!filterGroup.rules || filterGroup.rules.length === 0) &&
        (!filterGroup.groups || filterGroup.groups.length === 0) && (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              background: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px dashed var(--border)',
            }}
          >
            No active filters. Click <strong>Add Filter</strong> below to filter by price, date, category, status, etc.
          </div>
        )}

      {filterGroup.rules?.map((rule, idx) => {
        const type = getFieldType(rule.field);
        const availableOps = OPERATORS_BY_TYPE[type] || [];

        return (
          <div key={`rule-${idx}`} className="filter-rule-row">
            {/* Logic indicator between rules */}
            {idx > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  padding: '0.2rem 0.4rem',
                  background: 'var(--primary-light)',
                  borderRadius: '0.25rem',
                }}
              >
                {filterGroup.logic || 'AND'}
              </span>
            )}

            {/* Field Select */}
            <select
              className="filter-select"
              value={rule.field}
              onChange={(e) => handleRuleFieldChange(idx, e.target.value as FilterField)}
            >
              {FIELD_DEFINITIONS.map((def) => (
                <option key={def.field} value={def.field}>
                  {def.label}
                </option>
              ))}
            </select>

            {/* Operator Select */}
            <select
              className="filter-select"
              value={rule.operator}
              onChange={(e) => handleRuleOperatorChange(idx, e.target.value as FilterOperator)}
            >
              {availableOps.map((op) => (
                <option key={op.operator} value={op.operator}>
                  {op.label}
                </option>
              ))}
            </select>

            {/* Value input */}
            {renderValueInput(rule, (val) => handleRuleValueChange(idx, val))}

            {/* Remove button */}
            <button
              type="button"
              className="filter-btn-remove"
              title="Remove filter rule"
              onClick={() => handleRemoveRule(idx)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}

      {/* Nested Subgroups */}
      {filterGroup.groups?.map((subGroup, subIdx) => (
        <div key={`subgroup-${subIdx}`} className="filter-group-box">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Nested Group {subIdx + 1}
              </span>
              <div className="view-toggle-group">
                <button
                  type="button"
                  className={`view-toggle-btn ${subGroup.logic !== 'OR' ? 'active' : ''}`}
                  onClick={() =>
                    handleSubGroupChange(subIdx, { ...subGroup, logic: 'AND' })
                  }
                >
                  AND
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${subGroup.logic === 'OR' ? 'active' : ''}`}
                  onClick={() =>
                    handleSubGroupChange(subIdx, { ...subGroup, logic: 'OR' })
                  }
                >
                  OR
                </button>
              </div>
            </div>

            <button
              type="button"
              className="filter-btn-remove"
              title="Remove nested group"
              onClick={() => handleRemoveSubGroup(subIdx)}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {subGroup.rules?.map((rule, ruleIdx) => {
            const type = getFieldType(rule.field);
            const availableOps = OPERATORS_BY_TYPE[type] || [];

            return (
              <div key={`subrule-${ruleIdx}`} className="filter-rule-row">
                <select
                  className="filter-select"
                  value={rule.field}
                  onChange={(e) => {
                    const newField = e.target.value as FilterField;
                    const fType = getFieldType(newField);
                    const ops = OPERATORS_BY_TYPE[fType];
                    const op = ops[0].operator;
                    const val = getDefaultValueForField(newField, op);
                    const newRules = [...(subGroup.rules || [])];
                    newRules[ruleIdx] = { field: newField, operator: op, value: val };
                    handleSubGroupChange(subIdx, { ...subGroup, rules: newRules });
                  }}
                >
                  {FIELD_DEFINITIONS.map((def) => (
                    <option key={def.field} value={def.field}>
                      {def.label}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={rule.operator}
                  onChange={(e) => {
                    const op = e.target.value as FilterOperator;
                    const newRules = [...(subGroup.rules || [])];
                    newRules[ruleIdx] = { ...rule, operator: op };
                    handleSubGroupChange(subIdx, { ...subGroup, rules: newRules });
                  }}
                >
                  {availableOps.map((op) => (
                    <option key={op.operator} value={op.operator}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {renderValueInput(rule, (val) => {
                  const newRules = [...(subGroup.rules || [])];
                  newRules[ruleIdx] = { ...rule, value: val };
                  handleSubGroupChange(subIdx, { ...subGroup, rules: newRules });
                })}

                <button
                  type="button"
                  className="filter-btn-remove"
                  onClick={() => {
                    const newRules = [...(subGroup.rules || [])];
                    newRules.splice(ruleIdx, 1);
                    handleSubGroupChange(subIdx, { ...subGroup, rules: newRules });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              const newRules = [
                ...(subGroup.rules || []),
                { field: 'capacity' as FilterField, operator: 'gte' as FilterOperator, value: 10 },
              ];
              handleSubGroupChange(subIdx, { ...subGroup, rules: newRules });
            }}
          >
            <Plus size={14} />
            <span>Add Rule to Group</span>
          </button>
        </div>
      ))}

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1.25rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddRule}
          >
            <Plus size={15} />
            <span>Add Filter</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddGroup}
          >
            <FolderPlus size={15} />
            <span>Add Group</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReset}
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onApply}
          >
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
