import * as log from 'electron-log';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getConfigManager } from './config';

export class Logger {
  private static instance: Logger | null = null;
  private logsDir: string;

  constructor() {
    // Setup logs directory in app data
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.ensureLogsDirectory();
    this.setupLogger();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private setupLogger(): void {
    const configManager = getConfigManager();
    const logLevel = configManager.get('LOG_LEVEL');

    // Configure main log file with daily rotation
    const logFileName = `bonus-cards-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logsDir, logFileName);

    // Configure electron-log
    log.transports.file.level = logLevel;
    log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB max file size
    log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
    log.transports.file.fileName = logFileName;
    log.transports.file.resolvePathFn = () => logFilePath;

    // Configure console output for development
    log.transports.console.level = logLevel;
    log.transports.console.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';

    // Clean old log files (keep last 7 days)
    this.cleanOldLogs();

    log.info('Logger initialized', {
      logLevel,
      logFile: logFilePath,
      logsDirectory: this.logsDir
    });
  }

  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files.filter(file => file.startsWith('bonus-cards-') && file.endsWith('.log'));
      
      // Sort by date (newest first)
      logFiles.sort((a, b) => b.localeCompare(a));
      
      // Keep only the last 7 files
      const filesToDelete = logFiles.slice(7);
      
      filesToDelete.forEach(file => {
        const filePath = path.join(this.logsDir, file);
        try {
          fs.unlinkSync(filePath);
          log.info(`Deleted old log file: ${file}`);
        } catch (error) {
          log.warn(`Failed to delete old log file ${file}:`, error);
        }
      });
    } catch (error) {
      log.warn('Error cleaning old logs:', error);
    }
  }

  // Logging methods
  error(message: string, ...args: any[]): void {
    log.error(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    log.warn(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    log.info(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    log.debug(message, ...args);
  }

  // Get logs directory path
  getLogsDirectory(): string {
    return this.logsDir;
  }

  // Get current log file path
  getCurrentLogFile(): string {
    const logFileName = `bonus-cards-${new Date().toISOString().split('T')[0]}.log`;
    return path.join(this.logsDir, logFileName);
  }

  // Get list of available log files
  getLogFiles(): string[] {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files
        .filter(file => file.startsWith('bonus-cards-') && file.endsWith('.log'))
        .sort((a, b) => b.localeCompare(a)); // Newest first
    } catch (error) {
      this.warn('Error reading log files:', error);
      return [];
    }
  }

  // Read log file content (for troubleshooting)
  readLogFile(fileName: string): string {
    try {
      const filePath = path.join(this.logsDir, fileName);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      return '';
    } catch (error) {
      this.warn(`Error reading log file ${fileName}:`, error);
      return '';
    }
  }

  // Get recent log entries (last N lines)
  getRecentLogs(lines: number = 100): string[] {
    try {
      const currentLogFile = this.getCurrentLogFile();
      if (fs.existsSync(currentLogFile)) {
        const content = fs.readFileSync(currentLogFile, 'utf8');
        const allLines = content.split('\n').filter(line => line.trim());
        return allLines.slice(-lines);
      }
      return [];
    } catch (error) {
      this.warn('Error reading recent logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export electron-log for direct use if needed
export { log };