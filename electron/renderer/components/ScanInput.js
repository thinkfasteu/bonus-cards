"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const idempotency_1 = require("../lib/idempotency");
const ScanInput = ({ onScan, placeholder = "Barcode scannen...", disabled = false, autoFocus = true, debounceMs = 500 }) => {
    const inputRef = (0, react_1.useRef)(null);
    const [value, setValue] = (0, react_1.useState)('');
    // Create debounced scan handler
    const debouncedScan = (0, react_1.useRef)((0, idempotency_1.debounce)((scanData) => {
        if (scanData.trim()) {
            onScan(scanData.trim());
            setValue(''); // Clear input after successful scan
        }
    }, debounceMs));
    // Auto-focus the input
    (0, react_1.useEffect)(() => {
        if (autoFocus && inputRef.current && !disabled) {
            inputRef.current.focus();
        }
    }, [autoFocus, disabled]);
    // Re-focus when window regains focus
    (0, react_1.useEffect)(() => {
        const handleWindowFocus = () => {
            if (autoFocus && inputRef.current && !disabled) {
                inputRef.current.focus();
            }
        };
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, [autoFocus, disabled]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) {
            debouncedScan.current(value);
        }
    };
    const handleChange = (e) => {
        const newValue = e.target.value;
        setValue(newValue);
        // Auto-submit when Enter is pressed or when barcode is complete
        // Most barcode scanners send data followed by Enter
    };
    const handleKeyDown = (e) => {
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
    return (<form onSubmit={handleSubmit} className="scan-input-form">
      <div className="form-group">
        <label htmlFor="scan-input" className="form-label">
          Scanner
        </label>
        <div className="scan-input-wrapper">
          <input ref={inputRef} id="scan-input" type="text" className="form-control scan-input" value={value} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={handleBlur} placeholder={placeholder} disabled={disabled} autoComplete="off" spellCheck={false} style={{
            fontSize: '16px',
            padding: '12px 16px',
            border: '2px solid #007bff',
            borderRadius: '8px',
            backgroundColor: disabled ? '#f8f9fa' : 'white',
        }}/>
          <div className="scan-input-hint">
            <small className="text-muted">
              Barcode scannen oder manuell eingeben und Enter drücken
            </small>
          </div>
        </div>
      </div>
    </form>);
};
exports.default = ScanInput;
