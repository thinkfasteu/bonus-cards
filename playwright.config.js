"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: './tests/desktop',
    timeout: 30000,
    fullyParallel: false, // Electron tests should run sequentially
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Only one worker for Electron tests
    reporter: 'html',
    use: {
        // Global test settings
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'electron',
            testMatch: /.*\.spec\.ts/,
        },
    ],
});
