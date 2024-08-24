const express = require('express');
const path = require('path');
const net = require('net');

const app = express();
const initialPort = process.env.PORT || 3000;

// Serve static files from the test directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        server.close();
        resolve(true);
      })
      .listen(port);
  });
}

async function startServer(port) {
  try {
    console.log(`Attempting to start server on port ${port}...`);
    const available = await isPortAvailable(port);
    
    if (!available) {
      console.log(`Port ${port} is not available. Trying another port...`);
      return startServer(0); // Let the OS assign an available port
    }

    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      console.log(`Server running at http://localhost:${actualPort}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
    });

    return server;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(initialPort);
