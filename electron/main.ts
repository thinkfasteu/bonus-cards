import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron';
import * as path from 'path';
import { getConfigManager, AppConfig } from './config';
import { logger } from './logger';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
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
  } else {
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
    } else {
      mainWindow?.maximize();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize config manager
  const configManager = getConfigManager();
  logger.info('FTG Sportfabrik Bonus Cards starting up');
  logger.info('Config loaded from:', configManager.getConfigPath());

  // Create application menu
  createApplicationMenu();

  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.log('Blocked new window:', url);
    return { action: 'deny' };
  });
});

// IPC handlers for renderer communication
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});

ipcMain.handle('get-env', (_, key: string) => {
  return process.env[key];
});

// Config IPC handlers
ipcMain.handle('get-config', () => {
  const configManager = getConfigManager();
  return configManager.getConfig();
});

ipcMain.handle('get-config-value', (_, key: keyof AppConfig) => {
  const configManager = getConfigManager();
  return configManager.get(key);
});

ipcMain.handle('get-config-path', () => {
  const configManager = getConfigManager();
  return configManager.getConfigPath();
});

// Logging IPC handlers
ipcMain.handle('get-logs-directory', () => {
  return logger.getLogsDirectory();
});

ipcMain.handle('get-log-files', () => {
  return logger.getLogFiles();
});

ipcMain.handle('get-recent-logs', (_, lines: number) => {
  return logger.getRecentLogs(lines);
});

ipcMain.handle('read-log-file', (_, fileName: string) => {
  return logger.readLogFile(fileName);
});

// Update checking functionality
async function checkForUpdates(): Promise<void> {
  try {
    logger.info('Checking for updates...');
    
    // GitHub API to check latest release
    const repoOwner = 'thinkfasteu';
    const repoName = 'bonus-cards';
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'FTG-Bonus-Cards-Desktop'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const releaseData = await response.json() as any;
    const latestVersion = releaseData.tag_name?.replace(/^v/, '') || '';
    const currentVersion = app.getVersion();
    
    logger.info('Update check result', {
      currentVersion,
      latestVersion,
      isUpdateAvailable: latestVersion !== currentVersion
    });
    
    if (latestVersion && latestVersion !== currentVersion) {
      // Update available
      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update verfügbar',
        message: `Eine neue Version ist verfügbar!`,
        detail: `Aktuelle Version: ${currentVersion}\nNeue Version: ${latestVersion}\n\nMöchten Sie die GitHub-Releases-Seite öffnen?`,
        buttons: ['GitHub öffnen', 'Später', 'Release Notes'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (result.response === 0) {
        // Open GitHub releases page
        await shell.openExternal(`https://github.com/${repoOwner}/${repoName}/releases/latest`);
      } else if (result.response === 2) {
        // Show release notes
        await shell.openExternal(releaseData.html_url || `https://github.com/${repoOwner}/${repoName}/releases/latest`);
      }
    } else {
      // No update available
      await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Kein Update verfügbar',
        message: 'Sie verwenden bereits die neueste Version.',
        detail: `Aktuelle Version: ${currentVersion}`,
        buttons: ['OK']
      });
    }
  } catch (error) {
    logger.error('Update check failed:', error);
    
    await dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Update-Prüfung fehlgeschlagen',
      message: 'Die Update-Prüfung konnte nicht durchgeführt werden.',
      detail: 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es später erneut.',
      buttons: ['OK']
    });
  }
}

// Create application menu
function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Beenden',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Nach Updates suchen',
          click: () => {
            checkForUpdates();
          }
        },
        {
          label: 'Über FTG Bonus Cards',
          click: () => {
            // TODO: Show about dialog
            console.log('About dialog requested');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle app protocol for security
app.setAsDefaultProtocolClient('bonus-cards');