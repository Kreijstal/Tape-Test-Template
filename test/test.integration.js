const { spawn, exec, execSync } = require('child_process');
const waitOn = require('wait-on');
const net = require('net');
const path = require('path');

console.log('Starting integration test...');

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

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

// Function to terminate any process running on a specific port
async function terminateProcessOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const match = result.match(/LISTENING\s+(\d+)/);
      if (match) {
        const pid = match[1];
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Terminated process on port ${port}`);
      }
    } catch (error) {
      console.error(`Error terminating process on port ${port}:`, error);
    }
  } else {
    try {
      const result = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8' });
      if (result) {
        const pid = result.trim();
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`Terminated process on port ${port}`);
      }
    } catch (error) {
      console.error(`Error terminating process on port ${port}:`, error);
    }
  }
}

// Function to terminate the server
function terminateServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    console.log('Stopping server...');
    
    const forceKill = () => {
      console.log('Force killing server...');
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
        } catch (error) {
          console.error('Error force terminating server on Windows:', error);
        }
      } else {
        try {
          process.kill(server.pid, 'SIGKILL');
        } catch (error) {
          console.error('Error force terminating server:', error);
        }
      }
    };

    const timeout = setTimeout(() => {
      console.log('Server did not terminate gracefully. Force killing...');
      forceKill();
    }, 5000);  // Wait 5 seconds before force kill

    server.on('exit', () => {
      clearTimeout(timeout);
      console.log('Server process terminated.');
      resolve();
    });

    server.kill('SIGINT');  // Try SIGINT first
  });
}

let server;

async function runTests() {
  try {
    // Check if port 3000 is already in use and terminate the process if it is
    const portInUse = await isPortInUse(3000);
    if (portInUse) {
      console.log('Port 3000 is in use. Attempting to terminate the existing process...');
      await terminateProcessOnPort(3000);
      // Wait a bit to ensure the port is released
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Start the server from the test directory
    console.log('Creating server from test directory...');
    server = spawn('node', ['test/server.js'], { 
      stdio: 'pipe',
      shell: true,
      cwd: path.join(__dirname, '..')
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
      if (data.toString().includes("Cannot find module './test/server.js'")) {
        console.error("Error: server.js not found in the test directory. Please ensure it's in the correct location.");
        process.exit(1);
      }
    });

    // Wait for the server to be available
    console.log('Waiting for server to be available...');
    const startTime = Date.now();

    await new Promise((resolve, reject) => {
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

    const endTime = Date.now();
    console.log(`Server is up and running after ${endTime - startTime}ms. Starting Playwright tests...`);
    
    // Install Playwright browsers without system dependencies
    console.log('Installing Playwright browsers...');
    await runNpmCommand('npm exec -- playwright install chromium');
    console.log('Playwright browsers installed successfully.');

    // Run the Playwright tests
    console.log('Executing Playwright tests...');
    const playwrightStartTime = Date.now();
    await runNpmCommand(`npx cross-env TEST_URL=http://localhost:${serverPort} npm run test:playwright`);
    const playwrightEndTime = Date.now();
    console.log(`Playwright tests completed successfully in ${playwrightEndTime - playwrightStartTime}ms.`);
  } catch (error) {
    console.error('Error during test execution:', error);
    process.exitCode = 1;
  } finally {
    // Ensure server is terminated
    await terminateServer(server);
    process.exit(process.exitCode);
  }
}

runTests();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT.');
  await terminateServer(server);
  process.exit(0);  // Ensure the process exits
});

// Log any uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await terminateServer(server);
  process.exit(1);
});

// Log any unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await terminateServer(server);
  process.exit(1);
});
