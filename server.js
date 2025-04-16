
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
try {
    // Get tradeHash from URL path
    const tradeHash = req.params.tradeHash;
    // Get chainId specifically from query parameters sent by app.js
    const chainId = req.query.chainId;

    // Basic validation for chainId received by the proxy
    if (!chainId || isNaN(Number(chainId))) {
        console.error(`[Proxy Error] Invalid or missing chainId received in query:`, req.query);
        return res.status(400).json({
             message: "Bad request to proxy: Missing or invalid chainId query parameter."
         });
    }

    // Construct the final URL for the 0x API
    const url = `${config.ZERO_X_API.STATUS_URL}/${tradeHash}`;

    // Prepare the parameters object explicitly for the 0x API call
    const apiParams = {
        chainId: Number(chainId) // Ensure it's passed as a number if needed, though Axios usually handles string conversion
    };

    console.log(`Proxying to 0x Status API: ${url} with explicit params:`, apiParams); // Log what we're sending

    // Forward the request to the 0x API with only the necessary params
    const response = await axios.get(url, {
        params: apiParams, // <<< Use the explicitly created params object
        headers: {
            '0x-api-key': config.ZERO_X_API.API_KEY,
            '0x-version': config.ZERO_X_API.API_VERSION
        }
    });
    res.json(response.data);
} catch (error) {
    // Log the specific error received from 0x API if available
    console.error(`[Proxy Error] Error proxying to 0x status API (${error.response?.status}):`, error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
        message: "Failed to fetch status from 0x API via proxy.",
        details: error.response?.data || { message: error.message } // Provide more detail if possible
    });
}

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
