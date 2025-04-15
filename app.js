// app.js - Main application logic for the 0x Gasless Swap demo

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Global state
const appState = {
    web3: null,
    accounts: [],
    currentAccount: null,
    sourceChain: null,
    sourceToken: null,
    destinationToken: null,
    amount: null,
    recipientAddress: null,
    balances: {
        sourceTokenBefore: null,
        sourceTokenAfter: null,
        gasTokenBefore: null,
        gasTokenAfter: null
    },
    transaction: {
        hash: null,
        status: null
    },
    swapProcess: {
        signature: null,
        quoteData: null,
        allowanceTarget: null
    }
};

// Initialize the application
async function init() {
    // Set up event listeners
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('execute-swap').addEventListener('click', executeSwap);
    document.getElementById('copy-log').addEventListener('click', copyLog);
    document.getElementById('clear-log').addEventListener('click', clearLog);

    // Populate chain and token dropdowns
    populateChainDropdown();

    // Set up change event listeners for dropdowns
    document.getElementById('source-chain').addEventListener('change', handleSourceChainChange);
    document.getElementById('source-token').addEventListener('change', updateDebugInfo);
    document.getElementById('destination-token').addEventListener('change', updateDebugInfo);
    document.getElementById('amount').addEventListener('input', updateDebugInfo);
    document.getElementById('recipient-address').addEventListener('input', updateDebugInfo);

    // Initialize with default values
    document.getElementById('source-chain').value = config.DEFAULT_SOURCE_CHAIN;
    handleSourceChainChange(); // This will populate token dropdowns

    // Set default recipient address
    document.getElementById('recipient-address').value = config.DEFAULT_RECIPIENT_ADDRESS;

    // Update debug info
    updateDebugInfo();

    // Log initialization
    logEvent('Application initialized. Ready to connect wallet.', 'info');
}

// Connect to MetaMask wallet
async function connectWallet() {
    logEvent('Connecting to wallet...', 'info');
    updateStatus('Connecting to wallet...');

    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
        }

        // Initialize Web3
        appState.web3 = new Web3(window.ethereum);

        // Request accounts
        appState.accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        appState.currentAccount = appState.accounts[0];

        // Log success
        logEvent(`Wallet connected: ${appState.currentAccount}`, 'success');
        updateStatus('Wallet connected successfully.');

        // Update UI
        document.getElementById('connect-wallet').textContent = 'Wallet Connected';
        document.getElementById('connect-wallet').disabled = true;
        document.getElementById('execute-swap').disabled = false;
        document.getElementById('wallet-address').textContent = appState.currentAccount;
        document.getElementById('wallet-address').onclick = () => {
            const sourceChainId = document.getElementById('source-chain').value;
            const chain = config.getChainById(sourceChainId);
            if (chain) {
                window.open(`${chain.explorerUrl}/address/${appState.currentAccount}`, '_blank');
            }
        };

        // Add event listener for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);

        // Get initial balances
        await updateBalances();

        // Update debug info
        updateDebugInfo();
    } catch (error) {
        logEvent(`Error connecting wallet: ${error.message}`, 'error');
        updateStatus(`Failed to connect wallet: ${error.message}`);
        console.error('Wallet connection error:', error);
    }
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User has disconnected all accounts
        logEvent('Wallet disconnected.', 'warning');
        resetWalletConnection();
    } else if (accounts[0] !== appState.currentAccount) {
        // User has switched accounts
        appState.currentAccount = accounts[0];
        logEvent(`Wallet account changed: ${appState.currentAccount}`, 'info');
        document.getElementById('wallet-address').textContent = appState.currentAccount;
        updateBalances();
        updateDebugInfo();
    }
}

// Reset wallet connection state
function resetWalletConnection() {
    appState.web3 = null;
    appState.accounts = [];
    appState.currentAccount = null;

    // Update UI
    document.getElementById('connect-wallet').textContent = 'Connect Wallet';
    document.getElementById('connect-wallet').disabled = false;
    document.getElementById('execute-swap').disabled = true;
    document.getElementById('wallet-address').textContent = 'Not connected';

    // Reset balances
    appState.balances = {
        sourceTokenBefore: null,
        sourceTokenAfter: null,
        gasTokenBefore: null,
        gasTokenAfter: null
    };

    // Update debug info
    updateDebugInfo();
    updateStatus('Wallet disconnected. Please connect your wallet to continue.');
}

// Populate the source chain dropdown with available chains
function populateChainDropdown() {
    const chainDropdown = document.getElementById('source-chain');
    chainDropdown.innerHTML = '';

    // Add all chains from config
    for (const chainKey in config.CHAINS) {
        const chain = config.CHAINS[chainKey];
        const option = document.createElement('option');
        option.value = chain.id;
        option.textContent = chain.name;
        chainDropdown.appendChild(option);
    }
}

// Handle source chain change
function handleSourceChainChange() {
    const chainId = document.getElementById('source-chain').value;
    appState.sourceChain = config.getChainById(chainId);

    if (!appState.sourceChain) {
        logEvent(`Invalid chain ID: ${chainId}`, 'error');
        return;
    }

    const chainName = Object.keys(config.CHAINS).find(
        key => config.CHAINS[key].id === Number(chainId)
    );

    if (!chainName) {
        logEvent(`Could not find chain name for ID: ${chainId}`, 'error');
        return;
    }

    // Populate source token dropdown
    populateTokenDropdown('source-token', chainName);

    // Populate destination token dropdown (same chain for gasless swap)
    populateTokenDropdown('destination-token', chainName);

    // Update debug info
    updateDebugInfo();

    // Log event
    logEvent(`Source chain set to ${appState.sourceChain.name}`, 'info');
}

// Populate token dropdown for the specified chain
function populateTokenDropdown(dropdownId, chainName) {
    const tokenDropdown = document.getElementById(dropdownId);
    tokenDropdown.innerHTML = '';

    // Get tokens available for the selected chain
    const tokensForChain = config.getTokensForChain(chainName);

    // Add tokens to dropdown
    for (const tokenSymbol in tokensForChain) {
        const token = tokensForChain[tokenSymbol];
        const option = document.createElement('option');
        option.value = tokenSymbol;
        option.textContent = `${token.name} (${token.symbol})`;
        tokenDropdown.appendChild(option);
    }

    // Set default values
    if (dropdownId === 'source-token' && tokenDropdown.querySelector(`option[value="${config.DEFAULT_SOURCE_TOKEN}"]`)) {
        tokenDropdown.value = config.DEFAULT_SOURCE_TOKEN;
    } else if (dropdownId === 'destination-token' && tokenDropdown.querySelector(`option[value="${config.DEFAULT_DESTINATION_TOKEN}"]`)) {
        tokenDropdown.value = config.DEFAULT_DESTINATION_TOKEN;
    }
}

// Update balances for current account and selected tokens
async function updateBalances() {
    if (!appState.web3 || !appState.currentAccount) {
        logEvent('Cannot update balances: Wallet not connected', 'warning');
        return;
    }

    try {
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            logEvent('Cannot update balances: Invalid chain', 'warning');
            return;
        }

        // Get source token
        const sourceTokenSymbol = document.getElementById('source-token').value;
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);

        if (!sourceTokenAddress) {
            logEvent(`Cannot update balances: Token ${sourceTokenSymbol} not available on ${chainName}`, 'warning');
            return;
        }

        // Check if current network matches selected chain
        const currentNetwork = await appState.web3.eth.getChainId();
        if (currentNetwork !== sourceChain.id) {
            logEvent(`Please switch your wallet to the ${sourceChain.name} network (ID: ${sourceChain.id})`, 'warning');
            return;
        }

        // Get gas token (native) balance
        const gasBalance = await appState.web3.eth.getBalance(appState.currentAccount);
        appState.balances.gasTokenBefore = appState.web3.utils.fromWei(gasBalance, 'ether');

        // Get source token balance
        const tokenContract = new appState.web3.eth.Contract([
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ], sourceTokenAddress);

        const tokenDecimals = await tokenContract.methods.decimals().call();
        const tokenBalance = await tokenContract.methods.balanceOf(appState.currentAccount).call();

        // Calculate token balance with proper decimals
        appState.balances.sourceTokenBefore = tokenBalance / Math.pow(10, tokenDecimals);

        // Update UI with balances
        document.getElementById('debug-source-before').textContent = 
            `${appState.balances.sourceTokenBefore} ${sourceTokenSymbol}`;
        document.getElementById('debug-gas-before').textContent = 
            `${appState.balances.gasTokenBefore} ${sourceChain.nativeToken.symbol}`;

        logEvent(`Balances updated for account ${appState.currentAccount}`, 'info');
    } catch (error) {
        logEvent(`Error updating balances: ${error.message}`, 'error');
        console.error('Balance update error:', error);
    }
}

// Update balances after transaction
async function updateBalancesAfterSwap() {
    if (!appState.web3 || !appState.currentAccount) {
        return;
    }

    try {
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            return;
        }

        // Get source token
        const sourceTokenSymbol = document.getElementById('source-token').value;
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);

        if (!sourceTokenAddress) {
            return;
        }

        // Get gas token (native) balance
        const gasBalance = await appState.web3.eth.getBalance(appState.currentAccount);
        appState.balances.gasTokenAfter = appState.web3.utils.fromWei(gasBalance, 'ether');

        // Get source token balance
        const tokenContract = new appState.web3.eth.Contract([
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ], sourceTokenAddress);

        const tokenDecimals = await tokenContract.methods.decimals().call();
        const tokenBalance = await tokenContract.methods.balanceOf(appState.currentAccount).call();

        // Calculate token balance with proper decimals
        appState.balances.sourceTokenAfter = tokenBalance / Math.pow(10, tokenDecimals);

        // Calculate changes
        const sourceTokenChange = appState.balances.sourceTokenAfter - appState.balances.sourceTokenBefore;
        const gasTokenChange = appState.balances.gasTokenAfter - appState.balances.gasTokenBefore;

        // Update UI with balances
        document.getElementById('debug-source-after').textContent = 
            `${appState.balances.sourceTokenAfter} ${sourceTokenSymbol}`;
        document.getElementById('debug-gas-after').textContent = 
            `${appState.balances.gasTokenAfter} ${sourceChain.nativeToken.symbol}`;
        document.getElementById('debug-source-change').textContent = 
            `${sourceTokenChange.toFixed(6)} ${sourceTokenSymbol}`;
        document.getElementById('debug-gas-change').textContent = 
            `${gasTokenChange.toFixed(6)} ${sourceChain.nativeToken.symbol}`;

        // Verify if swap was gasless
        const gasTokenChangeRounded = Math.abs(parseFloat(gasTokenChange.toFixed(8)));
        if (gasTokenChangeRounded === 0) {
            document.getElementById('debug-gasless-verified').textContent = 'Yes ✅';
            document.getElementById('debug-gasless-verified').style.color = 'var(--success-color)';
            logEvent('Gasless swap verified! No change in gas token balance.', 'success');
        } else {
            document.getElementById('debug-gasless-verified').textContent = 'No ❌';
            document.getElementById('debug-gasless-verified').style.color = 'var(--error-color)';
            logEvent(`Swap used gas: ${gasTokenChange.toFixed(6)} ${sourceChain.nativeToken.symbol}`, 'warning');
        }
    } catch (error) {
        logEvent(`Error updating post-swap balances: ${error.message}`, 'error');
        console.error('Post-swap balance update error:', error);
    }
}

// Update debug information
function updateDebugInfo() {
    const sourceChainId = document.getElementById('source-chain').value;
    const sourceChain = config.getChainById(sourceChainId);
    const sourceTokenSymbol = document.getElementById('source-token').value;
    const destinationTokenSymbol = document.getElementById('destination-token').value;
    const amount = document.getElementById('amount').value;
    const recipientAddress = document.getElementById('recipient-address').value;

    if (sourceChain) {
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (chainName && sourceTokenSymbol) {
            document.getElementById('debug-source').textContent = `${chainName} / ${sourceTokenSymbol}`;
        }

        if (chainName && destinationTokenSymbol) {
            document.getElementById('debug-destination').textContent = `${chainName} / ${destinationTokenSymbol}`;
        }
    }

    if (amount) {
        document.getElementById('debug-amount-fiat').textContent = `${parseFloat(amount).toFixed(2)}`;

        // Calculate token amount based on token decimals
        if (sourceTokenSymbol) {
            const tokenInfo = config.TOKENS[sourceTokenSymbol];
            if (tokenInfo) {
                const tokenAmount = parseFloat(amount) * Math.pow(10, tokenInfo.decimals);
                document.getElementById('debug-amount-token').textContent = 
                    `${tokenAmount} (${tokenInfo.decimals} decimals)`;
            }
        }
    }

    if (recipientAddress) {
        appState.recipientAddress = recipientAddress;
    }
}

// Log an event to the event log
function logEvent(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;

    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Also log to console for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Update status message
function updateStatus(message) {
    document.getElementById('status-display').innerHTML = `<p>${message}</p>`;
}

// Copy log to clipboard
function copyLog() {
    const logContainer = document.getElementById('log-container');
    const logText = logContainer.innerText;

    navigator.clipboard.writeText(logText)
        .then(() => {
            logEvent('Log copied to clipboard', 'success');
        })
        .catch(error => {
            logEvent(`Failed to copy log: ${error.message}`, 'error');
        });
}

// Clear log
function clearLog() {
    document.getElementById('log-container').innerHTML = '';
    logEvent('Log cleared', 'info');
}

// Execute the gasless swap
async function executeSwap() {
    if (!appState.web3 || !appState.currentAccount) {
        logEvent('Cannot execute swap: Wallet not connected', 'error');
        updateStatus('Please connect your wallet to continue.');
        return;
    }

    try {
        // Gather swap parameters
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            throw new Error('Invalid source chain');
        }

        // Check if current network matches selected chain
        const currentNetwork = await appState.web3.eth.getChainId();
        if (currentNetwork !== sourceChain.id) {
            throw new Error(`Please switch your wallet to the ${sourceChain.name} network (ID: ${sourceChain.id})`);
        }

        // Get source and destination tokens
        const sourceTokenSymbol = document.getElementById('source-token').value;
        const destinationTokenSymbol = document.getElementById('destination-token').value;

        // Get token addresses
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);
        const destTokenAddress = config.getTokenAddressForChain(destinationTokenSymbol, chainName);

        if (!sourceTokenAddress || !destTokenAddress) {
            throw new Error('Invalid token selection');
        }

        // Get amount in USD
        const amountUsd = parseFloat(document.getElementById('amount').value);
        if (isNaN(amountUsd) || amountUsd <= 0) {
            throw new Error('Invalid amount');
        }

        // Get token decimals and calculate token amount
        const sourceTokenInfo = config.TOKENS[sourceTokenSymbol];
        const sourceTokenDecimals = sourceTokenInfo.decimals;
        const sellAmount = Math.floor(amountUsd * Math.pow(10, sourceTokenDecimals));

        // Get recipient address (default to current account if empty)
        let recipientAddress = document.getElementById('recipient-address').value.trim();
        if (!recipientAddress) {
            recipientAddress = appState.currentAccount;
            document.getElementById('recipient-address').value = recipientAddress;
        }

        // Validate recipient address
        if (!appState.web3.utils.isAddress(recipientAddress)) {
            throw new Error('Invalid recipient address');
        }

        // Update UI
        updateStatus('Initiating gasless swap...');
        logEvent(`Starting gasless swap process for ${amountUsd} USD worth of ${sourceTokenSymbol} to ${destinationTokenSymbol}`, 'info');
        document.getElementById('execute-swap').disabled = true;

        // STEP 1: Get initial price (gas quote)
        updateStatus('Step 1/5: Getting initial gas quote...');
        const gasQuote = await getGasQuote(sourceChainId, sourceTokenAddress, destTokenAddress, sellAmount, appState.currentAccount);

        // Assume gas fee from the quote
        const gasFeeInSourceToken = Math.ceil(sellAmount * 0.1); // Assuming 10% for gas as per the example
        logEvent(`Estimated gas cost: ${gasFeeInSourceToken / Math.pow(10, sourceTokenDecimals)} ${sourceTokenSymbol}`, 'info');

        // STEP 2: Get a price quote with gas included
        updateStatus('Step 2/5: Getting price quote with gas fee...');
        const totalAmount = sellAmount + gasFeeInSourceToken;
        const priceQuote = await getPriceQuote(sourceChainId, sourceTokenAddress, destTokenAddress, totalAmount, appState.currentAccount);

        // STEP 3: Get a firm price quote for the swap
        updateStatus('Step 3/5: Getting firm quote for the swap...');
        const firmQuote = await getFirmQuote(sourceChainId, sourceTokenAddress, destTokenAddress, totalAmount, appState.currentAccount);

        // Store quote data for later
        appState.swapProcess.quoteData = firmQuote;

        // Check if approval is needed
        if (firmQuote.approval && firmQuote.approval.signatureRequired) {
            // STEP 4: Get approval signature
            updateStatus('Step 4/5: Requesting token approval signature...');
            logEvent('Token approval required. Please sign the approval in your wallet.', 'info');

            // Get EIP-3009 authorization signature
            const signature = await getEIP3009Authorization(
                sourceTokenAddress,
                firmQuote.approval.spender,
                totalAmount,
                sourceChainId
            );

            appState.swapProcess.signature = signature;
        } else {
            logEvent('No additional token approval needed.', 'info');
        }

        // STEP 5: Execute the swap
        updateStatus('Step 5/5: Executing the swap...');
        const swapResult = await executeSwapTransaction(sourceChainId, firmQuote, appState.swapProcess.signature);

        // Handle swap result
        if (swapResult && swapResult.hash) {
            appState.transaction.hash = swapResult.hash;
            document.getElementById('debug-tx-hash').textContent = swapResult.hash;
            document.getElementById('debug-tx-hash').onclick = () => {
                window.open(`${sourceChain.explorerUrl}/tx/${swapResult.hash}`, '_blank');
            };

            updateStatus('Swap submitted successfully. Waiting for confirmation...');
            logEvent(`Swap transaction submitted. Hash: ${swapResult.hash}`, 'success');

            // Wait for status updates
            await monitorSwapStatus(swapResult.hash);
        } else {
            throw new Error('Failed to submit swap transaction');
        }
    } catch (error) {
        logEvent(`Swap error: ${error.message}`, 'error');
        updateStatus(`Swap failed: ${error.message}`);
        console.error('Swap execution error:', error);
        document.getElementById('execute-swap').disabled = false;
    }
}

// STEP 1: Get gas quote
async function getGasQuote(chainId, sellToken, buyToken, sellAmount, takerAddress) {
    logEvent('Getting initial gas quote...', 'info');

    try {
        const url = `${config.PROXY_SERVER_URL}/gasless/price?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&taker=${takerAddress}`;

        const response = await axios.get(url, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });

        if (response.data) {
            logEvent('Received initial gas quote.', 'success');
            console.log('Gas quote:', response.data);
            return response.data;
        } else {
            throw new Error('No data received from gas quote endpoint');
        }
    } catch (error) {
        console.error('Gas quote error:', error);
        throw new Error(`Failed to get gas quote: ${error.response?.data?.message || error.message}`);
    }
}

// STEP 2: Get a price quote with gas included
async function getPriceQuote(chainId, sellToken, buyToken, sellAmount, takerAddress) {
    logEvent('Getting price quote with gas fee included...', 'info');

    try {
        const url = `${config.PROXY_SERVER_URL}/0x/price?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&taker=${takerAddress}`;

        const response = await axios.get(url, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });

        if (response.data) {
            logEvent('Received price quote with gas included.', 'success');
            console.log('Price quote:', response.data);
            return response.data;
        } else {
            throw new Error('No data received from price quote endpoint');
        }
    } catch (error) {
        console.error('Price quote error:', error);
        throw new Error(`Failed to get price quote: ${error.response?.data?.message || error.message}`);
    }
}

// STEP 3: Get a firm quote for the swap
async function getFirmQuote(chainId, sellToken, buyToken, sellAmount, takerAddress) {
    logEvent('Getting firm quote for swap...', 'info');

    try {
        const url = `${config.PROXY_SERVER_URL}/0x/quote?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&taker=${takerAddress}`;

        const response = await axios.get(url, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });

        if (response.data) {
            logEvent(`Firm quote received. Will sell ${response.data.sellAmount} tokens to buy ${response.data.buyAmount} tokens.`, 'success');
            console.log('Firm quote:', response.data);

            // Store allowance target
            if (response.data.allowanceTarget) {
                appState.swapProcess.allowanceTarget = response.data.allowanceTarget;
            }

            return response.data;
        } else {
            throw new Error('No data received from firm quote endpoint');
        }
    } catch (error) {
        console.error('Firm quote error:', error);
        throw new Error(`Failed to get firm quote: ${error.response?.data?.message || error.message}`);
    }
}

// STEP 4: Get EIP-3009 Authorization signature
async function getEIP3009Authorization(tokenAddress, spender, amount, chainId) {
    logEvent('Preparing EIP-3009 authorization signature...', 'info');

    try {
        // Create a nonce (random 32-byte hex string)
        const nonce = appState.web3.utils.randomHex(32);

        // Calculate validBefore (5 minutes from now)
        const validBefore = Math.floor(Date.now() / 1000) + 300;

        // Prepare the EIP-712 typed data
        const tokenInfo = await getTokenInfo(tokenAddress);

        // Build typed data for signing
        const typedData = {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' }
                ],
                TransferWithAuthorization: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'validAfter', type: 'uint256' },
                    { name: 'validBefore', type: 'uint256' },
                    { name: 'nonce', type: 'bytes32' }
                ]
            },
            primaryType: 'TransferWithAuthorization',
            domain: {
                name: tokenInfo.name,
                version: tokenInfo.version,
                chainId: chainId,
                verifyingContract: tokenAddress
            },
            message: {
                from: appState.currentAccount,
                to: spender,
                value: amount.toString(),
                validAfter: '0',
                validBefore: validBefore.toString(),
                nonce: nonce
            }
        };

        logEvent('Requesting signature. Please check your wallet...', 'info');

        // Request signature from the wallet
        const signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [appState.currentAccount, JSON.stringify(typedData)]
        });

        logEvent('Signature obtained successfully.', 'success');
        console.log('EIP-3009 signature:', signature);

        return signature;
    } catch (error) {
        console.error('Signature error:', error);
        throw new Error(`Failed to get token authorization signature: ${error.message}`);
    }
}

// Helper function to get token info for EIP-3009 signature
async function getTokenInfo(tokenAddress) {
    try {
        // Find token in config
        for (const tokenSymbol in config.TOKENS) {
            const token = config.TOKENS[tokenSymbol];
            for (const chainName in token.addresses) {
                if (token.addresses[chainName].toLowerCase() === tokenAddress.toLowerCase()) {
                    return {
                        name: token.name,
                        version: token.version,
                        decimals: token.decimals
                    };
                }
            }
        }

        // If not found in config, fetch from contract
        const tokenContract = new appState.web3.eth.Contract([
            {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [{"name": "", "type": "string"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ], tokenAddress);

        const name = await tokenContract.methods.name().call();
        const decimals = await tokenContract.methods.decimals().call();

        return {
            name: name,
            version: '1', // Default version
            decimals: decimals
        };
    } catch (error) {
        console.error('Error fetching token info:', error);
        throw new Error(`Failed to get token information: ${error.message}`);
    }
}

// STEP 5: Execute the swap transaction
async function executeSwapTransaction(chainId, quote, signature = null) {
    logEvent('Executing swap transaction...', 'info');

    try {
        // Prepare the swap transaction payload
        const payload = {
            chainId: chainId,
            trade: {
                to: quote.to,
                data: quote.data,
                value: "0",
                gasless: true
            }
        };

        // Add signature if provided
        if (signature) {
            payload.trade.signature = signature;
        }

        // Send the swap request
        const response = await axios.post(`${config.PROXY_SERVER_URL}/0x/submit`, payload, {
            headers: {
                'Content-Type': 'application/json',
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': 'v2'  // Add the version header as required by the API
            }
        });

        if (response.data && response.data.hash) {
            logEvent(`Swap transaction submitted with hash: ${response.data.hash}`, 'success');
            return response.data;
        } else {
            throw new Error('No transaction hash received from submit endpoint');
        }
    } catch (error) {
        console.error('Swap execution error:', error);
        throw new Error(`Failed to execute swap: ${error.response?.data?.message || error.message}`);
    }
}

// Monitor the status of the swap transaction
async function monitorSwapStatus(tradeHash) {
    logEvent('Monitoring swap transaction status...', 'info');
    updateStatus('Monitoring transaction status...');

    try {
        let attempts = 0;
        const maxAttempts = 10;
        const pollingInterval = 5000; // 5 seconds

        const checkStatus = async () => {
            attempts++;

            try {
                const url = `${config.PROXY_SERVER_URL}/0x/status/${tradeHash}`;
                const response = await axios.get(url, {
                    headers: {
                        '0x-api-key': config.ZERO_X_API.API_KEY,
                        '0x-version': 'v2'  // Add the version header here too
                    }
                });

                if (response.data) {
                    logEvent(`Status update (attempt ${attempts}): ${response.data.status}`, 'info');
                    console.log('Status response:', response.data);

                    if (response.data.status ==='success') {
                        // Transaction confirmed
                        updateStatus('Swap completed successfully!');
                        logEvent('Swap transaction confirmed and successful!', 'success');

                        // Update balances after successful swap
                        await updateBalancesAfterSwap();

                        // Re-enable the swap button
                        document.getElementById('execute-swap').disabled = false;
                        return;
                    } else if (response.data.status === 'failed') {
                        // Transaction failed
                        updateStatus(`Swap failed: ${response.data.error || 'Unknown error'}`);
                        logEvent(`Swap transaction failed: ${response.data.error || 'Unknown error'}`, 'error');

                        // Re-enable the swap button
                        document.getElementById('execute-swap').disabled = false;
                        return;
                    } else if (attempts >= maxAttempts) {
                        // Max attempts reached
                        updateStatus('Monitoring timeout. Check explorer for latest status.');
                        logEvent('Reached maximum monitoring attempts. Please check the transaction on the block explorer.', 'warning');

                        // Re-enable the swap button
                        document.getElementById('execute-swap').disabled = false;
                        return;
                    }

                    // Continue polling
                    setTimeout(checkStatus, pollingInterval);
                } else {
                    throw new Error('No data received from status endpoint');
                }
            } catch (error) {
                console.error('Status check error:', error);
                logEvent(`Error checking status: ${error.message}`, 'error');

                if (attempts >= maxAttempts) {
                    updateStatus('Monitoring failed. Check explorer for latest status.');
                    logEvent('Status monitoring failed. Please check the transaction on the block explorer.', 'error');

                    // Re-enable the swap button
                    document.getElementById('execute-swap').disabled = false;
                    return;
                }

                // Continue polling despite error
                setTimeout(checkStatus, pollingInterval);
            }
        };

        // Start polling
        await checkStatus();
    } catch (error) {
        console.error('Status monitoring error:', error);
        logEvent(`Failed to monitor transaction status: ${error.message}`, 'error');
        updateStatus('Failed to monitor transaction status.');

        // Re-enable the swap button
        document.getElementById('execute-swap').disabled = false;
    }
}