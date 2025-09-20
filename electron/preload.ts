import { contextBridge, ipcRenderer } from 'electron';

// Configuration types
export interface AppConfig {
  DESKTOP_API_BASE_URL: string;
  EMAIL_DRY_RUN: boolean;
  UI_LOCALE: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config') as Promise<AppConfig>,
  getConfigValue: (key: keyof AppConfig) => ipcRenderer.invoke('get-config-value', key),
  getConfigPath: () => ipcRenderer.invoke('get-config-path') as Promise<string>,
  
  // Logging
  getLogsDirectory: () => ipcRenderer.invoke('get-logs-directory') as Promise<string>,
  getLogFiles: () => ipcRenderer.invoke('get-log-files') as Promise<string[]>,
  getRecentLogs: (lines?: number) => ipcRenderer.invoke('get-recent-logs', lines) as Promise<string[]>,
  readLogFile: (fileName: string) => ipcRenderer.invoke('read-log-file', fileName) as Promise<string>,
  
  // Scanner simulation (for testing)
  simulateScan: (callback: (data: string) => void) => {
    ipcRenderer.on('scanner-data', (event, data) => callback(data));
  },
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // Environment
  getEnv: (key: string) => ipcRenderer.invoke('get-env', key),
});

// Types for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  getConfig: () => Promise<AppConfig>;
  getConfigValue: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
  getConfigPath: () => Promise<string>;
  getLogsDirectory: () => Promise<string>;
  getLogFiles: () => Promise<string[]>;
  getRecentLogs: (lines?: number) => Promise<string[]>;
  readLogFile: (fileName: string) => Promise<string>;
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