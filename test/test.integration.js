const { spawn, exec, execSync } = require('child_process');
const waitOn = require('wait-on');
const net = require('net');

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

let server;
let serverPort;

// Function to terminate the server and clean up
async function cleanupServer() {
  if (server) {
    console.log('Stopping server...');
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
      } catch (error) {
        console.error('Error terminating server on Windows:', error);
      }
    } else {
      server.kill('SIGKILL');
    }
    await new Promise((resolve) => {
      server.on('exit', () => {
        console.log('Server process terminated.');
        resolve();
      });
    });
  }
  if (serverPort) {
    await terminateProcessOnPort(serverPort);
  }
}

async function runTests() {
  const testTimeout = setTimeout(() => {
    console.error('Test execution timed out after 5 minutes');
    cleanupServer().then(() => process.exit(1));
  }, 5 * 60 * 1000); // 5 minutes timeout
  try {
    // Check if port 3000 is already in use and terminate the process if it is
    const portInUse = await isPortInUse(3000);
    if (portInUse) {
      console.log('Port 3000 is in use. Attempting to terminate the existing process...');
      await terminateProcessOnPort(3000);
      // Wait a bit to ensure the port is released
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Start the server
    console.log('Creating server...');
    server = spawn('npm', ['run', 'start'], { 
      stdio: 'pipe',
      shell: true
    });

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
    clearTimeout(testTimeout);
    await cleanupServer();
    process.exit(process.exitCode);
  }
}

runTests().catch(async (error) => {
  console.error('Unhandled error in runTests:', error);
  await cleanupServer();
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT.');
  await cleanupServer();
  process.exit();
});

// Log any uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await cleanupServer();
  process.exit(1);
});

// Log any unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await cleanupServer();
  process.exit(1);
});
