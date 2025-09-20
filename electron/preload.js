"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('app-version'),
    getAppName: () => electron_1.ipcRenderer.invoke('app-name'),
    // Scanner simulation (for testing)
    simulateScan: (callback) => {
        electron_1.ipcRenderer.on('scanner-data', (event, data) => callback(data));
    },
    // Window controls
    minimize: () => electron_1.ipcRenderer.invoke('window-minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window-maximize'),
    close: () => electron_1.ipcRenderer.invoke('window-close'),
    // Environment
    getEnv: (key) => electron_1.ipcRenderer.invoke('get-env', key),
});
