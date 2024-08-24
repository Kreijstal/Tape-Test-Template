const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.test.js',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
  // outputDir is not set, so no artifacts will be saved by default
});
