const { test, expect } = require('@playwright/test');

test('browser test runs successfully', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for the test completion element to appear
  await page.waitForSelector('#test-completion', { state: 'visible', timeout: 10000 });

  // Get the text content of the test completion element
  const completionText = await page.textContent('#test-completion');

  // Check if the test completed successfully
  expect(completionText).toBe('Tests completed successfully');

  // Optional: Check for any failed assertions in the test results
  const testResults = await page.textContent('#test-results');
  expect(testResults).not.toContain('not ok');
});
