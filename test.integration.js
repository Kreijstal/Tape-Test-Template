const { spawn, exec, execSync } = require('child_process');
const waitOn = require('wait-on');
const path = require('path');

console.log('Starting integration test...');

// Function to run npm commands
function runNpmCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Output: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Start the server
console.log('Creating server...');
const server = spawn('npm', ['run', 'start'], { 
  stdio: 'pipe',
  shell: true
});

let serverPort;
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  const match = output.match(/Server running at http:\/\/localhost:(\d+)/);
  if (match) {
    serverPort = parseInt(match[1], 10);
    console.log(`Server started on port ${serverPort}`);
  }
});

server.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

// Wait for the server to be available
console.log('Waiting for server to be available...');
const startTime = Date.now();

const waitForServer = () => {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (serverPort) {
        clearInterval(checkInterval);
        waitOn({ 
          resources: [`http://localhost:${serverPort}/health`],
          timeout: 60000, // 60 seconds timeout
          interval: 100,  // Check every 100ms
        })
          .then(resolve)
          .catch(reject);
      }
    }, 100);
  });
};

waitForServer()
  .then(async () => {
    const endTime = Date.now();
    console.log(`Server is up and running after ${endTime - startTime}ms. Starting Playwright tests...`);
    
    try {
      // Install Playwright browsers
      console.log('Installing Playwright browsers...');
      try {
        await runNpmCommand('npm exec -- playwright install');
        console.log('Playwright browsers installed successfully.');
      } catch (error) {
        console.error('Error installing Playwright browsers:', error);
        throw error;
      }

      // Run the Playwright tests
      console.log('Executing Playwright tests...');
      const playwrightStartTime = Date.now();
      await runNpmCommand('npm run test:playwright');
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
        try {
          process.kill(server.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') {
            console.error('Error killing server process:', error);
          }
        }
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
