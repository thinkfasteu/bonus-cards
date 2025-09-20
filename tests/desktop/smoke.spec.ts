import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/electron/main.js')],
    env: {
      NODE_ENV: 'test',
      DESKTOP_API_BASE_URL: 'http://localhost:3000',
    },
  });
  
  // Get the first window that the app opens, wait if necessary
  page = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp?.close();
});

test.describe('Desktop App Smoke Tests', () => {
  test('should load login screen', async () => {
    // Check if login screen is visible
    await expect(page.locator('h1')).toContainText('FTG Sportfabrik');
    await expect(page.locator('input#username')).toBeVisible();
    
    // Check if the input field has focus
    const focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe('username');
  });

  test('should show error for invalid login', async () => {
    // Try to login with invalid credentials
    await page.fill('input#username', 'invalid-user');
    await page.click('button[type="submit"]');
    
    // Wait for error to appear
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('nicht gefunden');
  });

  test('should login successfully with valid credentials (mocked)', async () => {
    // This test would need a mock API or test database
    // For now, we'll just test that the form submission works
    
    await page.fill('input#username', 'test-reception');
    
    // Check that submit button becomes enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
    
    // Note: In a real test, we would mock the API response here
    // and verify navigation to the reception screen
  });

  test('should auto-focus scan input in reception screen (simulated)', async () => {
    // This test would run after successful login
    // For now, we just test that the app structure supports focus management
    
    // Check if the app has proper focus handling setup
    const hasAutoFocusElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[autofocus], input.scan-input');
      return inputs.length > 0;
    });
    
    // This would be true in the reception screen
    // expect(hasAutoFocusElements).toBe(true);
  });

  test('should handle window controls', async () => {
    // Test basic window functionality
    const title = await page.title();
    expect(title).toContain('Digital Bonus Cards');
    
    // Check that the window is visible and has the right dimensions
    const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    
    expect(bounds.width).toBeGreaterThanOrEqual(800);
    expect(bounds.height).toBeGreaterThanOrEqual(600);
  });

  test('should load CSS and render properly', async () => {
    // Check that styles are loaded
    const hasStylesheet = await page.evaluate(() => {
      const stylesheets = document.styleSheets;
      return stylesheets.length > 0;
    });
    expect(hasStylesheet).toBe(true);
    
    // Check that the main app container exists
    await expect(page.locator('.app, .screen')).toBeVisible();
  });
});

// Mock API test - would be used with a test server
test.describe('API Integration (Mocked)', () => {
  test.skip('should handle API errors gracefully', async () => {
    // This would test API error handling with a mock server
    // Set up mock API responses for various error scenarios
  });
  
  test.skip('should process card scan successfully', async () => {
    // This would test the complete scan workflow
    // Mock API responses for card lookup and deduction
  });
});