import React, { useEffect, useRef, useState } from 'react';
import { debounce } from '../lib/idempotency';

interface ScanInputProps {
  onScan: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  debounceMs?: number;
}

const ScanInput: React.FC<ScanInputProps> = ({ 
  onScan, 
  placeholder = "Barcode scannen...", 
  disabled = false,
  autoFocus = true,
  debounceMs = 500
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  // Create debounced scan handler
  const debouncedScan = useRef(
    debounce((scanData: string) => {
      if (scanData.trim()) {
        onScan(scanData.trim());
        setValue(''); // Clear input after successful scan
      }
    }, debounceMs)
  );

  // Auto-focus the input
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Re-focus when window regains focus
  useEffect(() => {
    const handleWindowFocus = () => {
      if (autoFocus && inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [autoFocus, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      debouncedScan.current(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Auto-submit when Enter is pressed or when barcode is complete
    // Most barcode scanners send data followed by Enter
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        debouncedScan.current(value);
      }
    }
  };

  const handleBlur = () => {
    // Re-focus after a short delay to handle clicking on other elements
    if (autoFocus && !disabled) {
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="scan-input-form">
      <div className="form-group">
        <label htmlFor="scan-input" className="form-label">
          Scanner
        </label>
        <div className="scan-input-wrapper">
          <input
            ref={inputRef}
            id="scan-input"
            type="text"
            className="form-control scan-input"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            style={{
              fontSize: '16px',
              padding: '12px 16px',
              border: '2px solid #007bff',
              borderRadius: '8px',
              backgroundColor: disabled ? '#f8f9fa' : 'white',
            }}
          />
          <div className="scan-input-hint">
            <small className="text-muted">
              Barcode scannen oder manuell eingeben und Enter drücken
            </small>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ScanInput;