// Global type declarations for the Electron renderer process

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  simulateScan: (callback: (data: string) => void) => void;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  getEnv: (key: string) => Promise<string | undefined>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// This export is required for this file to be treated as a module
export {};