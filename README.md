# Tape Test Template

This repository serves as a template for setting up a JavaScript testing environment using Tape, Express, and Playwright. It demonstrates how to run tests in both Node.js and browser environments, and includes integration tests using Playwright.

## Features

- Tape for writing and running tests
- Express server for serving the browser-based tests
- Playwright for running browser-based integration tests
- npm scripts for easy test execution and browser bundle creation

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 12 or higher)
- npm (usually comes with Node.js)

## Getting Started

To use this template, click the "Use this template" button on the GitHub repository page, or clone the repository and remove the existing git history.

After creating your project from this template, follow these steps:

1. Install the dependencies:
   ```
   npm install
   ```

2. Build the browser bundle:
   ```
   npm run build-browser
   ```

## Running Tests

This project includes several types of tests:

### Node.js Tests

To run the tests in Node.js:

```
npm test
```

### Browser Tests

To run the tests in a browser:

1. Start the Express server:
   ```
   npm start
   ```

2. Open a web browser and navigate to `http://localhost:3000`

### Integration Tests

To run the integration tests using Playwright:

```
npm run test:integration
```

This will start the server, install Playwright browsers if necessary, and run the Playwright tests.

## Project Structure

- `test.js`: Contains the Tape tests
- `server.js`: Express server for serving the browser tests
- `index.html`: HTML file for running tests in the browser
- `playwright.test.js`: Playwright test file for browser integration tests
- `test.integration.js`: Script to run the integration tests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
