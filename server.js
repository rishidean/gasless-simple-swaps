
// server.js - Express server for the 0x Gasless Swap demo

const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');

// Create Express app
const app = express();

// Port configuration
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Serve config as JS file
app.get('/config.js', (req, res) => {
    // Create client-side config (strips server-only properties)
    const clientConfig = `
        // Client-side config 
        const config = ${JSON.stringify(config, null, 2)};
    `;
    res.type('text/javascript').send(clientConfig);
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`0x Gasless Swap server running on port ${PORT}`);
    console.log(`Open in your browser: http://localhost:${PORT}`);
});
