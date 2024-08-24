const { spawn } = require('child_process');
const waitOn = require('wait-on');
const { execSync } = require('child_process');
const path = require('path');

console.log('Starting integration test...');

// Determine the correct npm command based on the platform
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Start the server
console.log('Creating server...');
const server = spawn(npmCmd, ['run', 'start'], { 
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
console.log('Server process created with PID:', server.pid);

// Wait for the server to be available
console.log('Waiting for server to be available...');
const startTime = Date.now();
waitOn({ 
  resources: ['http://localhost:3000/health'],
  timeout: 60000, // 60 seconds timeout
  interval: 100,  // Check every 100ms
})
  .then(() => {
    const endTime = Date.now();
    console.log(`Server is up and running after ${endTime - startTime}ms. Starting Playwright tests...`);
    
    try {
      // Install Playwright browsers
      console.log('Installing Playwright browsers...');
      try {
        const installOutput = execSync(`"${npmCmd}" exec -- playwright install`, { 
          stdio: 'pipe',
          shell: process.platform === 'win32'
        }).toString();
        console.log('Playwright browsers installed successfully.');
      } catch (error) {
        console.error('Error installing Playwright browsers:');
        console.error(error.stdout?.toString());
        console.error(error.stderr?.toString());
        throw error;
      }

      // Run the Playwright tests
      console.log('Executing Playwright tests...');
      const playwrightStartTime = Date.now();
      execSync(`"${npmCmd}" run test:playwright`, { 
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      const playwrightEndTime = Date.now();
      console.log(`Playwright tests completed successfully in ${playwrightEndTime - playwrightStartTime}ms.`);
    } catch (error) {
      console.error('Playwright tests failed:', error);
      process.exitCode = 1;
    } finally {
      // Kill the server
      console.log('Stopping server...');
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
      } else {
        server.kill();
      }
      console.log('Server process terminated.');
      process.exit(process.exitCode);
    }
  })
  .catch((error) => {
    console.error('Error waiting for server:', error);
    console.log('Stopping server due to error...');
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    } else {
      server.kill();
    }
    console.log('Server process terminated.');
    process.exitCode = 1;
    process.exit(process.exitCode);
  });

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT. Stopping server...');
  if (process.platform === 'win32') {
    execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  } else {
    server.kill();
  }
  console.log('Server process terminated.');
  process.exit();
});

// Log any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.platform === 'win32') {
    execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  } else {
    server.kill();
  }
  console.log('Server process terminated due to uncaught exception.');
  process.exit(1);
});

// Log any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.platform === 'win32') {
    execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  } else {
    server.kill();
  }
  console.log('Server process terminated due to unhandled rejection.');
  process.exit(1);
});
