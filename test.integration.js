const { spawn, execSync } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');

console.log('Starting integration test...');

// Function to run commands in MSYS2 bash
function runInMsys2Bash(command) {
  const msys2Path = process.env.MSYS2_PATH || 'C:\\msys64\\usr\\bin\\bash.exe';
  return execSync(`"${msys2Path}" -lc "${command}"`, { 
    stdio: 'inherit',
    shell: true
  });
}

// Start the server
console.log('Creating server...');
const server = spawn('npm', ['run', 'start'], { 
  stdio: 'inherit',
  shell: true
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
        if (process.platform === 'win32') {
          runInMsys2Bash('npm exec -- playwright install');
        } else {
          execSync('npm exec -- playwright install', { stdio: 'inherit' });
        }
        console.log('Playwright browsers installed successfully.');
      } catch (error) {
        console.error('Error installing Playwright browsers:', error);
        throw error;
      }

      // Run the Playwright tests
      console.log('Executing Playwright tests...');
      const playwrightStartTime = Date.now();
      if (process.platform === 'win32') {
        runInMsys2Bash('npm run test:playwright');
      } else {
        execSync('npm run test:playwright', { stdio: 'inherit' });
      }
      const playwrightEndTime = Date.now();
      console.log(`Playwright tests completed successfully in ${playwrightEndTime - playwrightStartTime}ms.`);
    } catch (error) {
      console.error('Playwright tests failed:', error);
      process.exitCode = 1;
    } finally {
      // Kill the server
      console.log('Stopping server...');
      if (process.platform === 'win32') {
        runInMsys2Bash(`kill -9 ${server.pid}`);
      } else {
        process.kill(server.pid, 'SIGKILL');
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
      process.kill(server.pid, 'SIGKILL');
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
    process.kill(server.pid, 'SIGKILL');
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
    process.kill(server.pid, 'SIGKILL');
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
    process.kill(server.pid, 'SIGKILL');
  }
  console.log('Server process terminated due to unhandled rejection.');
  process.exit(1);
});
