# 0x Gasless Swap Demo

A proof-of-concept web application that demonstrates gasless token swaps using the 0x Gasless API.

## Overview

This application allows users to perform token swaps on the same blockchain without requiring the blockchain's native gas token. The app uses the 0x Gasless API to facilitate these swaps, where the gas fee is paid in the source token rather than the chain's native token.

## Features

- Connect to MetaMask wallet
- Select source blockchain and tokens
- Perform same-chain gasless swaps
- Detailed event logging and debugging information
- Real-time transaction status monitoring
- Balance tracking before and after swaps
- Verification of gasless operations

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask browser extension
- Tokens for testing on supported networks

## Supported Networks

- Ethereum Mainnet
- Base
- Polygon
- Optimism
- Arbitrum
- Avalanche

## Supported Tokens

The application supports various tokens including:
- USDC
- DAI
- USDT
- WETH
- EURC
- POL

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open your browser and navigate to: `http://localhost:3000`

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## How It Works

The application follows these steps to perform a gasless swap:

1. Get an initial gas quote for the swap
2. Calculate the total amount including gas fee
3. Obtain a firm quote for the swap
4. If necessary, get token approval via EIP-3009 signature
5. Execute the swap transaction via 0x Gasless API
6. Monitor the transaction status

## Application Structure

- `index.html` - Main HTML file
- `styles.css` - Styling for the application
- `app.js` - Client-side JavaScript with the main application logic
- `config.js` - Configuration file with API keys, chain information, and token data
- `server.js` - Express server for running the application

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [0x Protocol](https://0x.org/) for providing the Gasless API
- [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) for the gasless token transfer standard
