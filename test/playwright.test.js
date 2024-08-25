const { test, expect } = require('@playwright/test');

test('browser test runs successfully', async ({ page }) => {
  await page.goto('http://localhost:3000');

  console.log('Page loaded');

  // Wait for the test completion element to appear
  try {
    await page.waitForSelector('#test-completion', { state: 'visible', timeout: 20000 });
    console.log('Test completion element found');
  } catch (error) {
    console.error('Test completion element not found:', error);
    
    // Log the page content for debugging
    const content = await page.content();
    console.log('Page content:', content);

    throw error;
  }
  await page.waitForFunction(() => window.testsCompleted === true, { timeout: 9000 });
  // Get the text content of the test completion element
  const completionText = await page.textContent('#test-completion');
  console.log('Completion text:', completionText);

  // Check if the test completed successfully
  expect(completionText).toBe('Tests completed successfully');

  // Optional: Check for any failed assertions in the test results
  const testResults = await page.textContent('#test-results');
  console.log('Test results:', testResults);
  expect(testResults).not.toContain('not ok');
});
