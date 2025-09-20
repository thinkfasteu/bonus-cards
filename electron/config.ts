import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface AppConfig {
  DESKTOP_API_BASE_URL: string;
  EMAIL_DRY_RUN: boolean;
  UI_LOCALE: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

export const DEFAULT_CONFIG: AppConfig = {
  DESKTOP_API_BASE_URL: 'http://localhost:3000',
  EMAIL_DRY_RUN: true,
  UI_LOCALE: 'de',
  LOG_LEVEL: 'info'
};

export class ConfigManager {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    // Store config in app data directory (outside bundled code)
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  /**
   * Load configuration from file or create with defaults
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const parsedConfig = JSON.parse(configData);
        
        // Merge with defaults to ensure all required keys exist
        this.config = {
          ...DEFAULT_CONFIG,
          ...parsedConfig
        };
        
        console.log('Config loaded from:', this.configPath);
      } else {
        // Create default config file
        this.saveConfig();
        console.log('Created default config at:', this.configPath);
      }
    } catch (error) {
      console.error('Error loading config, using defaults:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save current configuration to file
   */
  private saveConfig(): void {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write config with nice formatting
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('Config saved to:', this.configPath);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get specific config value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Update configuration (admin only - not exposed to reception UI)
   */
  updateConfig(updates: Partial<AppConfig>): boolean {
    try {
      this.config = {
        ...this.config,
        ...updates
      };
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      return false;
    }
  }

  /**
   * Get path to config file (for documentation/troubleshooting)
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Validate config values
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API URL
    try {
      new URL(this.config.DESKTOP_API_BASE_URL);
    } catch {
      errors.push('DESKTOP_API_BASE_URL must be a valid URL');
    }

    // Validate locale
    const supportedLocales = ['de', 'en'];
    if (!supportedLocales.includes(this.config.UI_LOCALE)) {
      errors.push(`UI_LOCALE must be one of: ${supportedLocales.join(', ')}`);
    }

    // Validate log level
    const logLevels = ['error', 'warn', 'info', 'debug'];
    if (!logLevels.includes(this.config.LOG_LEVEL)) {
      errors.push(`LOG_LEVEL must be one of: ${logLevels.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a sample config file with comments (for IT documentation)
   */
  createSampleConfig(outputPath: string): void {
    const sampleConfig = {
      "_comment": "FTG Sportfabrik Bonus Cards Configuration",
      "_description": {
        "DESKTOP_API_BASE_URL": "URL of the bonus cards API server (e.g., http://localhost:3000 or https://api.ftg-sportfabrik.de)",
        "EMAIL_DRY_RUN": "Set to false to send real emails, true for testing/dry-run mode",
        "UI_LOCALE": "User interface language: 'de' for German, 'en' for English",
        "LOG_LEVEL": "Logging verbosity: 'error', 'warn', 'info', or 'debug'"
      },
      ...DEFAULT_CONFIG
    };

    fs.writeFileSync(outputPath, JSON.stringify(sampleConfig, null, 2), 'utf8');
  }
}

// Global config manager instance
let configManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}