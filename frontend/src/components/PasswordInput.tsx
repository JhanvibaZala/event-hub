import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onToggleVisibility?: (isVisible: boolean) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className = '',
      style,
      disabled,
      onToggleVisibility,
      id,
      ...restProps
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowPassword((prev) => {
        const next = !prev;
        if (onToggleVisibility) {
          onToggleVisibility(next);
        }
        return next;
      });
    };

    return (
      <div
        className="password-input-wrapper"
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          ref={ref}
          id={id}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={`form-input ${className}`.trim()}
          style={{
            paddingRight: '2.5rem',
            width: '100%',
            ...style,
          }}
          {...restProps}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          className="password-toggle-btn"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '0.25rem',
            margin: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            borderRadius: '0.25rem',
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          {showPassword ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
