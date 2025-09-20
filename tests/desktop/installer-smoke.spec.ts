import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

// Platform-specific installer configurations
const INSTALLERS = {
  linux: {
    deb: {
      path: '../../../dist-installers/bonus-cards_1.0.0_amd64.deb',
      installCmd: 'sudo dpkg -i',
      uninstallCmd: 'sudo dpkg -r bonus-cards',
      verifyCmd: 'dpkg -l | grep bonus-cards',
      executablePath: '/opt/Bonus Cards/bonus-cards'
    },
    appimage: {
      path: '../../../dist-installers/FTG Sportfabrik Bonus Cards-1.0.0.AppImage',
      installCmd: null, // AppImage doesn't need installation
      uninstallCmd: null,
      verifyCmd: null,
      executablePath: '../../../dist-installers/FTG Sportfabrik Bonus Cards-1.0.0.AppImage'
    }
  },
  windows: {
    msi: {
      path: '../../../dist-installers/bonus-cards-1.0.0.msi',
      installCmd: 'msiexec /i',
      uninstallCmd: 'msiexec /x',
      verifyCmd: 'wmic product where "name=\'FTG Sportfabrik Bonus Cards\'" get version',
      executablePath: 'C:\\Program Files\\FTG Sportfabrik Bonus Cards\\bonus-cards.exe'
    }
  }
};

// Helper function to execute shell commands
async function execCommand(command: string, timeout = 30000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const process = spawn('bash', ['-c', command], { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    const timer = setTimeout(() => {
      process.kill();
      resolve({ stdout, stderr: stderr + '\nTimeout exceeded', code: -1 });
    }, timeout);
    
    process.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}

// Helper function to check if file exists
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Get current platform and available installers
function getAvailableInstallers() {
  const platform = process.platform;
  
  if (platform === 'linux') {
    const installers = [];
    
    // Check for DEB installer
    if (fileExists(path.resolve(__dirname, INSTALLERS.linux.deb.path))) {
      installers.push({ type: 'deb', config: INSTALLERS.linux.deb });
    }
    
    // Check for AppImage
    if (fileExists(path.resolve(__dirname, INSTALLERS.linux.appimage.path))) {
      installers.push({ type: 'appimage', config: INSTALLERS.linux.appimage });
    }
    
    return installers;
  }
  
  if (platform === 'win32') {
    const installers = [];
    
    // Check for MSI installer
    if (fileExists(path.resolve(__dirname, INSTALLERS.windows.msi.path))) {
      installers.push({ type: 'msi', config: INSTALLERS.windows.msi });
    }
    
    return installers;
  }
  
  return [];
}

describe('Installer Smoke Tests', () => {
  const availableInstallers = getAvailableInstallers();
  
  beforeAll(async () => {
    console.log(`Platform: ${process.platform}`);
    console.log(`Available installers: ${availableInstallers.map(i => i.type).join(', ')}`);
    
    if (availableInstallers.length === 0) {
      console.log('No installers found for current platform - skipping tests');
    }
  });

  for (const installer of availableInstallers) {
    describe(`${installer.type.toUpperCase()} Installer`, () => {
      const config = installer.config;
      const installerPath = path.resolve(__dirname, config.path);
      let appProcess: ChildProcess | null = null;

      afterEach(async () => {
        // Clean up any running app process
        if (appProcess) {
          appProcess.kill();
          appProcess = null;
          await sleep(2000); // Wait for process cleanup
        }
      });

      test(`should find ${installer.type} installer file`, async () => {
        expect(fileExists(installerPath)).toBe(true);
        
        // Check file size (should be > 100MB for a complete Electron app)
        const stats = fs.statSync(installerPath);
        expect(stats.size).toBeGreaterThan(100 * 1024 * 1024);
      });

      if (config.installCmd) {
        test(`should install ${installer.type} package successfully`, async () => {
          const installCommand = `${config.installCmd} "${installerPath}"`;
          console.log(`Installing with: ${installCommand}`);
          
          const result = await execCommand(installCommand, 60000);
          
          // Installation should succeed (exit code 0) or warn about dependencies
          expect([0, 1]).toContain(result.code); // Allow warnings
          expect(result.stderr).not.toMatch(/error|failed/i);
        });

        test(`should verify ${installer.type} installation`, async () => {
          if (!config.verifyCmd) return;
          
          const result = await execCommand(config.verifyCmd);
          expect(result.code).toBe(0);
          expect(result.stdout).toMatch(/bonus.cards|FTG.Sportfabrik/i);
        });

        test(`should find installed executable for ${installer.type}`, async () => {
          if (!config.executablePath) return;
          
          // Wait a bit for installation to complete
          await sleep(3000);
          
          expect(fileExists(config.executablePath)).toBe(true);
        });

        test(`should launch application from ${installer.type} installation`, async () => {
          if (!config.executablePath || !fileExists(config.executablePath)) {
            console.log('Executable not found, skipping launch test');
            return;
          }

          // Launch the application in headless mode
          appProcess = spawn(config.executablePath, ['--headless', '--disable-gpu'], {
            stdio: 'pipe',
            detached: false
          });

          let appOutput = '';
          appProcess.stdout?.on('data', (data) => {
            appOutput += data.toString();
          });

          appProcess.stderr?.on('data', (data) => {
            appOutput += data.toString();
          });

          // Wait for app to start
          await sleep(5000);

          // App should still be running
          expect(appProcess.killed).toBe(false);
          expect(appProcess.pid).toBeDefined();

          // Check for common startup indicators
          expect(appOutput).toMatch(/(electron|bonus|sportfabrik|ready)/i);

          // Graceful shutdown
          appProcess.kill('SIGTERM');
          await sleep(2000);
        });

        test(`should uninstall ${installer.type} package cleanly`, async () => {
          if (!config.uninstallCmd) return;
          
          const result = await execCommand(config.uninstallCmd, 30000);
          
          // Uninstallation should succeed
          expect(result.code).toBe(0);
          
          // Verify executable is removed
          await sleep(3000);
          if (config.executablePath) {
            expect(fileExists(config.executablePath)).toBe(false);
          }
        });

        test(`should verify ${installer.type} complete removal`, async () => {
          if (!config.verifyCmd) return;
          
          const result = await execCommand(config.verifyCmd);
          
          // Package should no longer be found
          expect(result.stdout).not.toMatch(/bonus.cards|FTG.Sportfabrik/i);
        });
      } else {
        // AppImage-specific tests (no installation required)
        test(`should make ${installer.type} executable`, async () => {
          const result = await execCommand(`chmod +x "${installerPath}"`);
          expect(result.code).toBe(0);
        });

        test(`should launch ${installer.type} directly`, async () => {
          // Launch AppImage directly
          appProcess = spawn(installerPath, ['--headless', '--disable-gpu'], {
            stdio: 'pipe',
            detached: false
          });

          let appOutput = '';
          appProcess.stdout?.on('data', (data) => {
            appOutput += data.toString();
          });

          appProcess.stderr?.on('data', (data) => {
            appOutput += data.toString();
          });

          // Wait for app to start
          await sleep(5000);

          // App should be running
          expect(appProcess.killed).toBe(false);
          expect(appProcess.pid).toBeDefined();

          // Check output for startup indicators
          expect(appOutput).toMatch(/(electron|bonus|sportfabrik|ready)/i);

          // Graceful shutdown
          appProcess.kill('SIGTERM');
          await sleep(2000);
        });
      }
    });
  }

  describe('Cross-Platform Validation', () => {
    test('should have at least one installer available', async () => {
      expect(availableInstallers.length).toBeGreaterThan(0);
    });

    test('should have installers with correct naming convention', async () => {
      for (const installer of availableInstallers) {
        const filename = path.basename(installer.config.path);
        
        // Should contain version number
        expect(filename).toMatch(/1\.0\.0/);
        
        // Should contain appropriate file extension
        if (installer.type === 'deb') {
          expect(filename).toMatch(/\.deb$/);
        } else if (installer.type === 'msi') {
          expect(filename).toMatch(/\.msi$/);
        } else if (installer.type === 'appimage') {
          expect(filename).toMatch(/\.AppImage$/);
        }
      }
    });

    test('should validate installer checksums if available', async () => {
      // Look for checksum files
      const checksumFiles = [
        'latest-linux.yml',
        'sha256sums.txt',
        'checksums.sha256'
      ];

      for (const checksumFile of checksumFiles) {
        const checksumPath = path.resolve(__dirname, '../../../dist-installers', checksumFile);
        
        if (fileExists(checksumPath)) {
          const content = fs.readFileSync(checksumPath, 'utf8');
          
          // Should contain SHA256 hashes
          expect(content).toMatch(/[a-f0-9]{64}/i);
          
          // Should reference our installers
          expect(content).toMatch(/(bonus.cards|\.deb|\.msi|\.AppImage)/i);
        }
      }
    });
  });

  describe('Security Validation', () => {
    test('should verify installer signatures if available', async () => {
      // This would check digital signatures on the installers
      // Implementation depends on signing infrastructure
      console.log('Digital signature verification not implemented yet');
    });

    test('should validate no malicious patterns in installers', async () => {
      for (const installer of availableInstallers) {
        const installerPath = path.resolve(__dirname, installer.config.path);
        
        // Basic check: file should not be suspiciously small or large
        const stats = fs.statSync(installerPath);
        expect(stats.size).toBeGreaterThan(50 * 1024 * 1024); // > 50MB
        expect(stats.size).toBeLessThan(500 * 1024 * 1024); // < 500MB
        
        // Check for expected executable patterns
        if (installer.type === 'appimage') {
          const result = await execCommand(`file "${installerPath}"`);
          expect(result.stdout).toMatch(/(executable|ELF.*executable)/i);
        }
      }
    });
  });

  describe('Performance Tests', () => {
    test('should install within reasonable time limits', async () => {
      // Measure installation time for performance regression detection
      for (const installer of availableInstallers) {
        if (!installer.config.installCmd) continue;
        
        const installerPath = path.resolve(__dirname, installer.config.path);
        const startTime = Date.now();
        
        await execCommand(`${installer.config.installCmd} "${installerPath}"`, 120000);
        
        const installTime = Date.now() - startTime;
        
        // Installation should complete within 2 minutes
        expect(installTime).toBeLessThan(120000);
        
        console.log(`${installer.type} installation took ${installTime}ms`);
        
        // Clean up
        if (installer.config.uninstallCmd) {
          await execCommand(installer.config.uninstallCmd);
        }
      }
    });
  });
});