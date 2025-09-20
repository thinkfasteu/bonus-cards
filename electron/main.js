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
const electron_1 = require("electron");
const path = __importStar(require("path"));
// Keep a global reference of the window object
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional app icon
        show: false, // Don't show until ready
        titleBarStyle: 'default',
    });
    // Load the app
    if (isDev) {
        // Development: load from localhost
        mainWindow.loadURL('http://localhost:3001');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production: load from built files
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    }
    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        // Dereference the window object
        mainWindow = null;
    });
    // Handle window controls
    mainWindow.on('minimize', () => {
        mainWindow?.minimize();
    });
    mainWindow.on('maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
}
// This method will be called when Electron has finished initialization
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Security: Prevent new window creation
electron_1.app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        console.log('Blocked new window:', url);
        return { action: 'deny' };
    });
});
// IPC handlers for renderer communication
electron_1.ipcMain.handle('app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('app-name', () => {
    return electron_1.app.getName();
});
electron_1.ipcMain.handle('get-env', (_, key) => {
    return process.env[key];
});
// Handle app protocol for security
electron_1.app.setAsDefaultProtocolClient('bonus-cards');
