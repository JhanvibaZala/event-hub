import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onChange,
}) => {
  return (
    <div className="view-toggle-group">
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => onChange('grid')}
        title="Grid view"
      >
        <LayoutGrid size={16} />
        <span>Grid</span>
      </button>

      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onChange('list')}
        title="List view"
      >
        <List size={16} />
        <span>List</span>
      </button>
    </div>
  );
};
