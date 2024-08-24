const { test, expect } = require('@playwright/test');

test('browser test runs successfully', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
  });

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

  // Get the text content of the test completion element
  const completionText = await page.textContent('#test-completion');
  console.log('Completion text:', completionText);

  // Check if the test completed successfully
  expect(completionText).toBe('Tests completed successfully');

  // Get and log the full test results
  const testResults = await page.textContent('#test-results');
  console.log('Full test results:');
  console.log(testResults);

  // Check for any failed assertions in the test results
  expect(testResults).not.toContain('not ok');
});
