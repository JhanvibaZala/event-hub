import React from 'react';
import { SortRule } from '../eventsSlice';
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react';

interface MultiSortControlProps {
  sortRules: SortRule[];
  onChange: (rules: SortRule[]) => void;
}

const SORTABLE_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'startDate', label: 'Start Date' },
  { field: 'price', label: 'Admission Price' },
  { field: 'capacity', label: 'Capacity' },
  { field: 'registeredCount', label: 'Registered Count' },
  { field: 'title', label: 'Title (A-Z)' },
  { field: 'createdAt', label: 'Recently Added' },
];

export const MultiSortControl: React.FC<MultiSortControlProps> = ({
  sortRules,
  onChange,
}) => {
  const currentRules =
    sortRules.length > 0
      ? sortRules
      : [{ field: 'startDate', direction: 'ASC' as const }];

  const handleFieldChange = (index: number, newField: string) => {
    const updated = [...currentRules];
    updated[index] = { ...updated[index], field: newField };
    onChange(updated);
  };

  const handleDirectionChange = (index: number, newDir: 'ASC' | 'DESC') => {
    const updated = [...currentRules];
    updated[index] = { ...updated[index], direction: newDir };
    onChange(updated);
  };

  const handleAddRule = () => {
    if (currentRules.length >= 3) return;
    const remainingFields = SORTABLE_FIELDS.filter(
      (f) => !currentRules.some((r) => r.field === f.field),
    );
    const nextField = remainingFields[0]?.field || 'price';
    onChange([...currentRules, { field: nextField, direction: 'ASC' }]);
  };

  const handleRemoveRule = (index: number) => {
    if (currentRules.length <= 1) return;
    const updated = [...currentRules];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
        <ArrowUpDown size={16} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sort By:</span>
      </div>

      {currentRules.map((rule, idx) => (
        <div
          key={`sort-${idx}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: '#ffffff',
            border: '1px solid var(--border)',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.5rem',
          }}
        >
          {idx > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              then
            </span>
          )}

          <select
            className="filter-select"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.825rem', border: 'none' }}
            value={rule.field}
            onChange={(e) => handleFieldChange(idx, e.target.value)}
          >
            {SORTABLE_FIELDS.map((f) => (
              <option key={f.field} value={f.field}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.825rem', border: 'none' }}
            value={rule.direction}
            onChange={(e) => handleDirectionChange(idx, e.target.value as 'ASC' | 'DESC')}
          >
            <option value="ASC">Ascending (Low to High / A-Z)</option>
            <option value="DESC">Descending (High to Low / Z-A)</option>
          </select>

          {currentRules.length > 1 && (
            <button
              type="button"
              className="filter-btn-remove"
              title="Remove sort rule"
              style={{ padding: '0.2rem' }}
              onClick={() => handleRemoveRule(idx)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {currentRules.length < 3 && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
          onClick={handleAddRule}
          title="Add secondary sorting rule"
        >
          <Plus size={13} />
          <span>Add Sort</span>
        </button>
      )}
    </div>
  );
};
