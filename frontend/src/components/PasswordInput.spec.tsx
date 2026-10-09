// @vitest-environment happy-dom
import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { PasswordInput } from './PasswordInput';

// Configure React act environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('PasswordInput Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('should render masked password input (type="password") by default', () => {
    act(() => {
      root.render(<PasswordInput placeholder="Enter password" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    const button = container.querySelector('button') as HTMLButtonElement;

    expect(input).not.toBeNull();
    expect(input.type).toBe('password');
    expect(input.placeholder).toBe('Enter password');

    expect(button).not.toBeNull();
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Show password');
    expect(button.getAttribute('title')).toBe('Show password');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('should reveal password as readable text when eye button is clicked', () => {
    act(() => {
      root.render(<PasswordInput defaultValue="Secret123!" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    const button = container.querySelector('button') as HTMLButtonElement;

    expect(input.type).toBe('password');

    // Click toggle to show password
    act(() => {
      button.click();
    });

    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Hide password');
    expect(button.getAttribute('title')).toBe('Hide password');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('should mask password again when clicked a second time', () => {
    act(() => {
      root.render(<PasswordInput defaultValue="Secret123!" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    const button = container.querySelector('button') as HTMLButtonElement;

    // First click: reveal
    act(() => {
      button.click();
    });
    expect(input.type).toBe('text');

    // Second click: mask
    act(() => {
      button.click();
    });
    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-label')).toBe('Show password');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('should call onToggleVisibility callback when visibility changes', () => {
    const onToggle = vi.fn();

    act(() => {
      root.render(<PasswordInput onToggleVisibility={onToggle} />);
    });

    const button = container.querySelector('button') as HTMLButtonElement;

    act(() => {
      button.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenLastCalledWith(true);

    act(() => {
      button.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it('should support independent toggle states for multiple password fields', () => {
    act(() => {
      root.render(
        <div>
          <PasswordInput id="pass1" placeholder="Password" />
          <PasswordInput id="pass2" placeholder="Confirm Password" />
        </div>,
      );
    });

    const inputs = container.querySelectorAll('input');
    const buttons = container.querySelectorAll('button');

    expect(inputs).toHaveLength(2);
    expect(buttons).toHaveLength(2);

    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('password');

    // Toggle only the first field
    act(() => {
      buttons[0].click();
    });

    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('password'); // Remains masked!

    // Toggle the second field
    act(() => {
      buttons[1].click();
    });

    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('text'); // Both now visible independently
  });

  it('should forward ref correctly to the underlying HTMLInputElement', () => {
    const ref = createRef<HTMLInputElement>();

    act(() => {
      root.render(<PasswordInput ref={ref} name="user_password" />);
    });

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('INPUT');
    expect(ref.current?.name).toBe('user_password');
  });

  it('should apply paddingRight to prevent text overlap with the toggle icon', () => {
    act(() => {
      root.render(<PasswordInput />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.style.paddingRight).toBe('2.5rem');
  });

  it('should prevent default on mousedown to preserve input focus', () => {
    act(() => {
      root.render(<PasswordInput />);
    });

    const button = container.querySelector('button') as HTMLButtonElement;
    const mousedownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const prevented = !button.dispatchEvent(mousedownEvent);

    expect(prevented).toBe(true);
  });
});
