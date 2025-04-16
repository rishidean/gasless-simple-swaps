
// server.js - Express server for the 0x Gasless Swap demo

const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');

// Create Express app
const app = express();

// Port configuration
const PORT = process.env.PORT || 3000;
const ALTERNATIVE_PORT = 5000; // Use this if default port is taken

// Enable CORS for all routes
app.use(cors());

// Parse JSON body for POST requests
app.use(express.json());

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

// Proxy route for 0x API price
app.get('/api/gasless/price', async (req, res) => {
    try {
        const response = await axios.get(`${config.ZERO_X_API.PRICE_URL}`, {
            params: req.query,
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to 0x price API:', error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Proxy route for 0x API quote
app.get('/api/gasless/quote', async (req, res) => {
    try {
        const response = await axios.get(`${config.ZERO_X_API.QUOTE_URL}`, {
            params: req.query,
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to 0x quote API:', error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Proxy route for 0x API submit
app.post('/api/gasless/submit', async (req, res) => {
    try {
        const response = await axios.post(config.ZERO_X_API.SUBMIT_URL, req.body, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to 0x submit API:', error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Proxy route for 0x API status
app.get('/api/gasless/status/:tradeHash', async (req, res) => {
    try {
        const url = `${config.ZERO_X_API.STATUS_URL}/${req.params.tradeHash}`;
        const response = await axios.get(url, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to 0x status API:', error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Start the server with fallback to alternative port
const server = app.listen(PORT, () => {
    console.log(`0x Gasless Swap server running on port ${PORT}`);
    console.log(`Open in your browser: http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying alternative port ${ALTERNATIVE_PORT}`);
        app.listen(ALTERNATIVE_PORT, () => {
            console.log(`0x Gasless Swap server running on port ${ALTERNATIVE_PORT}`);
            console.log(`Open in your browser: http://localhost:${ALTERNATIVE_PORT}`);
        });
    } else {
        console.error('Server error:', err);
    }
});
