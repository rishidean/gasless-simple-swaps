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
// Update balances for current account and selected tokens (BEFORE swap)
async function updateBalances() {
    if (!appState.web3 || !appState.currentAccount) {
        logEvent('Cannot update balances: Wallet not connected', 'warning');
        return;
    }

    logEvent('Fetching initial balances...', 'info');
    try {
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            logEvent('Cannot update balances: Invalid chain', 'warning');
            return;
        }

        // Check if current network matches selected chain
        const currentNetwork = await appState.web3.eth.getChainId();
        if (currentNetwork !== sourceChain.id) {
            logEvent(`Please switch your wallet to the ${sourceChain.name} network (ID: ${sourceChain.id})`, 'warning');
            // Clear balances if network doesn't match
            appState.balances.gasTokenBefore = null;
            appState.balances.sourceTokenBefore = null;
            document.getElementById('debug-source-before').textContent = '-';
            document.getElementById('debug-gas-before').textContent = '-';
            return;
        }

        // Get source token
        const sourceTokenSymbol = document.getElementById('source-token').value;
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);
        const sourceTokenInfo = config.TOKENS[sourceTokenSymbol];

        if (!sourceTokenAddress || !sourceTokenInfo) {
            logEvent(`Cannot update balances: Token ${sourceTokenSymbol} not available on ${chainName}`, 'warning');
            appState.balances.sourceTokenBefore = null;
            document.getElementById('debug-source-before').textContent = '-';
            return;
        }

        // Get gas token (native) balance
        const gasBalanceWei = await appState.web3.eth.getBalance(appState.currentAccount);
        appState.balances.gasTokenBefore = parseFloat(appState.web3.utils.fromWei(gasBalanceWei, 'ether'));
        document.getElementById('debug-gas-before').textContent =
            `${appState.balances.gasTokenBefore.toFixed(6)} ${sourceChain.nativeToken.symbol}`;

        // Get source token balance
        const tokenContract = new appState.web3.eth.Contract(config.ERC20_ABI, sourceTokenAddress);
        const tokenBalanceRaw = await tokenContract.methods.balanceOf(appState.currentAccount).call();
        appState.balances.sourceTokenBefore = parseFloat(tokenBalanceRaw) / Math.pow(10, sourceTokenInfo.decimals);
        document.getElementById('debug-source-before').textContent =
            `${appState.balances.sourceTokenBefore.toFixed(6)} ${sourceTokenSymbol}`;

        logEvent(`Balances updated for account ${appState.currentAccount}`, 'info');

        // Clear 'After' and 'Change' fields whenever 'Before' is updated
        document.getElementById('debug-source-after').textContent = '-';
        document.getElementById('debug-gas-after').textContent = '-';
        document.getElementById('debug-source-change').textContent = '-';
        document.getElementById('debug-gas-change').textContent = '-';
        document.getElementById('debug-gasless-verified').textContent = '-';
        document.getElementById('debug-gasless-verified').style.color = 'inherit';


    } catch (error) {
        logEvent(`Error updating balances: ${error.message}`, 'error');
        console.error('Balance update error:', error);
        // Clear balance fields on error
        document.getElementById('debug-source-before').textContent = 'Error';
        document.getElementById('debug-gas-before').textContent = 'Error';
    }
}


// Update balances after transaction
// Update balances AFTER successful swap
async function updateBalancesAfterSwap() {
    if (!appState.web3 || !appState.currentAccount) {
        return; // Should not happen if called after successful swap
    }

    logEvent('Fetching post-swap balances...', 'info');
    try {
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            logEvent('Cannot update post-swap balances: Invalid chain', 'warning');
            return;
        }

        // Get source token info
        const sourceTokenSymbol = document.getElementById('source-token').value;
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);
        const sourceTokenInfo = config.TOKENS[sourceTokenSymbol];

        if (!sourceTokenAddress || !sourceTokenInfo) {
             logEvent(`Cannot update post-swap balances: Token ${sourceTokenSymbol} not found`, 'warning');
            return;
        }

        // --- Get POST-SWAP Balances ---

        // Get gas token (native) balance AFTER
        const gasBalanceWeiAfter = await appState.web3.eth.getBalance(appState.currentAccount);
        appState.balances.gasTokenAfter = parseFloat(appState.web3.utils.fromWei(gasBalanceWeiAfter, 'ether'));
        document.getElementById('debug-gas-after').textContent =
            `${appState.balances.gasTokenAfter.toFixed(6)} ${sourceChain.nativeToken.symbol}`;

        // Get source token balance AFTER
        const tokenContract = new appState.web3.eth.Contract(config.ERC20_ABI, sourceTokenAddress);
        const tokenBalanceRawAfter = await tokenContract.methods.balanceOf(appState.currentAccount).call();
        appState.balances.sourceTokenAfter = parseFloat(tokenBalanceRawAfter) / Math.pow(10, sourceTokenInfo.decimals);
        document.getElementById('debug-source-after').textContent =
            `${appState.balances.sourceTokenAfter.toFixed(6)} ${sourceTokenSymbol}`;

        // --- Calculate and Display Changes ---

        // Check if 'Before' balances exist before calculating change
        if (appState.balances.sourceTokenBefore !== null && appState.balances.gasTokenBefore !== null) {
            // Calculate source token change
            const sourceTokenChange = appState.balances.sourceTokenAfter - appState.balances.sourceTokenBefore;
            document.getElementById('debug-source-change').textContent =
                `${sourceTokenChange.toFixed(6)} ${sourceTokenSymbol}`;
            document.getElementById('debug-source-change').style.color = sourceTokenChange < 0 ? 'var(--error-color)' : 'var(--success-color)';


            // Calculate gas token change
            const gasTokenChange = appState.balances.gasTokenAfter - appState.balances.gasTokenBefore;
            document.getElementById('debug-gas-change').textContent =
                `${gasTokenChange.toFixed(6)} ${sourceChain.nativeToken.symbol}`;

            // Verify if swap was gasless (allow for tiny dust amounts)
            const gasThreshold = 1e-8; // Very small threshold
            if (Math.abs(gasTokenChange) < gasThreshold) {
                document.getElementById('debug-gasless-verified').textContent = 'Yes ✅';
                document.getElementById('debug-gasless-verified').style.color = 'var(--success-color)';
                logEvent('Gasless swap verified! Negligible change in gas token balance.', 'success');
                document.getElementById('debug-gas-change').style.color = 'var(--success-color)';

            } else {
                document.getElementById('debug-gasless-verified').textContent = 'No ❌';
                document.getElementById('debug-gasless-verified').style.color = 'var(--error-color)';
                logEvent(`Swap used gas: ${gasTokenChange.toFixed(8)} ${sourceChain.nativeToken.symbol}`, 'warning');
                 document.getElementById('debug-gas-change').style.color = 'var(--error-color)';
            }
        } else {
             logEvent('Could not calculate changes: Missing pre-swap balances.', 'warning');
             document.getElementById('debug-source-change').textContent = 'N/A';
             document.getElementById('debug-gas-change').textContent = 'N/A';
             document.getElementById('debug-gasless-verified').textContent = 'N/A';
        }

    } catch (error) {
        logEvent(`Error updating post-swap balances: ${error.message}`, 'error');
        console.error('Post-swap balance update error:', error);
        // Indicate error in UI
        document.getElementById('debug-source-after').textContent = 'Error';
        document.getElementById('debug-gas-after').textContent = 'Error';
        document.getElementById('debug-source-change').textContent = 'Error';
        document.getElementById('debug-gas-change').textContent = 'Error';
        document.getElementById('debug-gasless-verified').textContent = 'Error';
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
// Execute the gasless swap
async function executeSwap() {
    logEvent('Initiating swap process...', 'info');
    updateStatus('Starting swap...');
    document.getElementById('execute-swap').disabled = true; // Disable button early

    // --- Pre-checks ---
    if (!appState.web3 || !appState.currentAccount) {
        logEvent('Cannot execute swap: Wallet not connected', 'error');
        updateStatus('Error: Please connect your wallet.');
        document.getElementById('execute-swap').disabled = false; // Re-enable button
        return;
    }

    try {
        // --- Gather Swap Parameters ---
        const sourceChainId = document.getElementById('source-chain').value;
        const sourceChain = config.getChainById(sourceChainId);
        const chainName = Object.keys(config.CHAINS).find(key => config.CHAINS[key].id === Number(sourceChainId));

        if (!sourceChain || !chainName) {
            throw new Error('Invalid source chain selected.');
        }

        // Check network match
        const currentNetwork = await appState.web3.eth.getChainId();
        if (currentNetwork !== sourceChain.id) {
            throw new Error(`Network mismatch: Please switch your wallet to ${sourceChain.name} (ID: ${sourceChain.id}).`);
        }

        const sourceTokenSymbol = document.getElementById('source-token').value;
        const destinationTokenSymbol = document.getElementById('destination-token').value;
        const sourceTokenAddress = config.getTokenAddressForChain(sourceTokenSymbol, chainName);
        const destTokenAddress = config.getTokenAddressForChain(destinationTokenSymbol, chainName);
        const sourceTokenInfo = config.TOKENS[sourceTokenSymbol];

        if (!sourceTokenAddress || !destTokenAddress || !sourceTokenInfo) {
            throw new Error('Invalid token selection for the chosen chain.');
        }

        const amountInput = document.getElementById('amount').value; // Use the raw input for now
        // const amountUsd = parseFloat(document.getElementById('amount').value);
        // if (isNaN(amountUsd) || amountUsd <= 0) {
        //     throw new Error('Invalid amount entered.');
        // }
        // const sellAmount = Math.floor(amountUsd * Math.pow(10, sourceTokenInfo.decimals));
        // NOTE: The 0x API actually expects sellAmount in the token's smallest unit (atomic), not USD.
        // We need to adjust this logic later if amount is meant to be USD.
        // For now, assuming the input 'amount' is the token amount to sell.
        const amountToSell = parseFloat(amountInput);
         if (isNaN(amountToSell) || amountToSell <= 0) {
             throw new Error('Invalid amount entered.');
         }
        const sellAmountAtomic = BigInt(Math.floor(amountToSell * Math.pow(10, sourceTokenInfo.decimals))).toString();


        let recipientAddress = document.getElementById('recipient-address').value.trim();
        if (!recipientAddress) {
            recipientAddress = appState.currentAccount; // Default to self
            document.getElementById('recipient-address').value = recipientAddress; // Update UI
        }
        if (!appState.web3.utils.isAddress(recipientAddress)) {
            throw new Error('Invalid recipient address format.');
        }

        logEvent(`Attempting to swap ${amountToSell} ${sourceTokenSymbol} to ${destinationTokenSymbol} on ${chainName}`, 'info');

        // --- Step 1 & 2: Get Firm Quote ---
        // NOTE: The Price endpoint isn't strictly needed for Gasless v2 as Quote includes fees.
        // We go directly to Quote.
        updateStatus('Step 1/3: Getting swap quote...');
        logEvent(`Requesting quote to sell ${sellAmountAtomic} ${sourceTokenSymbol} wei...`, 'info');
        const quoteResponse = await getFirmQuote(sourceChainId, sourceTokenAddress, destTokenAddress, sellAmountAtomic, appState.currentAccount);

        // !!! IMPORTANT CHECK (Addresses Q1) !!!
        if (!quoteResponse || !quoteResponse.trade || !quoteResponse.trade.eip712) {
             // Check if a specific error message exists, otherwise use a generic one
            const quoteError = quoteResponse?.validationErrors?.[0]?.description || 'Quote invalid or unavailable (e.g., insufficient liquidity).';
            throw new Error(`Failed to get valid quote: ${quoteError}`);
        }
        logEvent(`Quote received: Sell ${quoteResponse.sellAmount / Math.pow(10, sourceTokenInfo.decimals)} ${sourceTokenSymbol}, Buy approx. ${quoteResponse.buyAmount / Math.pow(10, config.TOKENS[destinationTokenSymbol]?.decimals || 18)} ${destinationTokenSymbol}`, 'success');
        console.log("Full Quote Response:", quoteResponse); // Log for deeper debugging

        // Store quote data
        appState.swapProcess.quoteData = quoteResponse;

        // --- Step 2: Get Signatures ---
        updateStatus('Step 2/3: Obtaining signatures...');
        let tradeSignature = null;
        let approvalSignature = null;

        // Get TRADE signature (always required for Gasless v2)
        if (quoteResponse.trade && quoteResponse.trade.eip712) {
            logEvent('Requesting TRADE signature (EIP-712)... Please check wallet.', 'info');
            const tradeTypedData = quoteResponse.trade.eip712;
            try {
                tradeSignature = await window.ethereum.request({
                    method: 'eth_signTypedData_v4',
                    params: [appState.currentAccount, JSON.stringify(tradeTypedData)]
                });
                logEvent('Trade signature obtained.', 'success');
            } catch (signError) {
                console.error("Trade signing error:", signError);
                throw new Error(`User rejected or failed trade signature: ${signError.message}`);
            }
        } else {
            // Should not happen if quote validation passed, but good safety check
            throw new Error('Critical error: Valid quote missing required trade data.');
        }

        // Get APPROVAL signature (only if needed)
        if (quoteResponse.approval && quoteResponse.approval.eip712) {
            logEvent('Token APPROVAL required. Requesting signature... Please check wallet.', 'info');
            const approvalTypedData = quoteResponse.approval.eip712;
             try {
                approvalSignature = await window.ethereum.request({
                    method: 'eth_signTypedData_v4',
                    params: [appState.currentAccount, JSON.stringify(approvalTypedData)]
                });
                logEvent('Approval signature obtained.', 'success');
            } catch (signError) {
                console.error("Approval signing error:", signError);
                throw new Error(`User rejected or failed approval signature: ${signError.message}`);
            }
        } else {
            logEvent('No separate token approval signature required.', 'info');
        }

        // --- Step 3: Execute Swap Transaction ---
        updateStatus('Step 3/3: Submitting swap transaction...');
        await executeSwapTransaction(
            sourceChainId,
            quoteResponse,
            tradeSignature,
            approvalSignature // Pass null if not obtained
        );

        // Note: updateBalancesAfterSwap() and button re-enabling happens
        // within the monitorSwapStatus function upon success/failure/timeout.

    } catch (error) {
        // Catch errors from any step above
        logEvent(`Swap process failed: ${error.message}`, 'error');
        updateStatus(`Error: ${error.message}`);
        console.error('Swap execution error details:', error);
        document.getElementById('execute-swap').disabled = false; // Re-enable button on failure
    }
}

// STEP 1: Get a price quote with gas included
async function getPriceQuote(chainId, sellToken, buyToken, sellAmount, takerAddress) {
    logEvent('Getting price quote with gas fee included...', 'info');

    try {
        const url = `${config.PROXY_SERVER_URL}/gasless/price?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&taker=${takerAddress}`;

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

// STEP 2: Get a firm quote for the swap
async function getFirmQuote(chainId, sellToken, buyToken, sellAmount, takerAddress) {
    logEvent('Getting firm quote for swap...', 'info');

    try {
        const url = `${config.PROXY_SERVER_URL}/gasless/quote?chainId=${chainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&taker=${takerAddress}`;

        const response = await axios.get(url, {
            headers: {
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });

        if (response.data) {
            logEvent(`Firm quote received. Will sell ${response.data.sellAmount} tokens to buy ${response.data.buyAmount} tokens.`, 'success');
            console.log('Firm quote:', response.data);
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

// STEP 4: Execute the swap transaction
// Execute the swap transaction with signatures
async function executeSwapTransaction(chainId, quoteResponse, tradeSignature, approvalSignature = null) {
    logEvent('Executing swap transaction...', 'info');

    try {
        // Parse the trade signature
        const splitTradeSignature = splitSignature(tradeSignature);

        // Prepare the request payload
        const payload = {
            chainId: Number(chainId),
            trade: {
                type: quoteResponse.trade.type,
                eip712: quoteResponse.trade.eip712,
                signature: {
                    v: splitTradeSignature.v,
                    r: splitTradeSignature.r,
                    s: splitTradeSignature.s,
                    signatureType: 2  // EIP712 signature type
                }
            }
        };

        // Add approval if needed
        if (approvalSignature && quoteResponse.approval) {
            const splitApprovalSignature = splitSignature(approvalSignature);

            payload.approval = {
                type: quoteResponse.approval.type,
                eip712: quoteResponse.approval.eip712,
                signature: {
                    v: splitApprovalSignature.v,
                    r: splitApprovalSignature.r,
                    s: splitApprovalSignature.s,
                    signatureType: 2  // EIP712 signature type
                }
            };
        }

        console.log('Submit payload:', JSON.stringify(payload, null, 2));

        // Send the swap request
        const response = await axios.post(`${config.PROXY_SERVER_URL}/gasless/submit`, payload, {
            headers: {
                'Content-Type': 'application/json',
                '0x-api-key': config.ZERO_X_API.API_KEY,
                '0x-version': config.ZERO_X_API.API_VERSION
            }
        });

        // Check for either hash or tradeHash in the response
        if (response.data && (response.data.hash || response.data.tradeHash)) {
            // Use whichever hash exists
            const txHash = response.data.hash || response.data.tradeHash;
            logEvent(`Swap transaction submitted with hash: ${txHash}`, 'success');
            updateStatus('Swap submitted successfully. Waiting for confirmation...');
            document.getElementById('debug-tx-hash').textContent = txHash;
            document.getElementById('debug-tx-hash').onclick = () => {
                const sourceChainId = document.getElementById('source-chain').value;
                const sourceChain = config.getChainById(sourceChainId);
                if (sourceChain) {
                    window.open(`${sourceChain.explorerUrl}/tx/${txHash}`, '_blank');
                }
            };

            // Return the data FIRST, then start monitoring
            const result = {
                ...response.data,
                hash: txHash
            };

            // Start monitoring the transaction status separately
            // This ensures we don't block the function return
            const currentChainId = Number(chainId); // Ensure it's a number from the function parameter
            setTimeout(() => {
                monitorSwapStatus(txHash, currentChainId)
                    .catch(err => {
                        console.error('Error in status monitoring:', err);
                        logEvent(`Monitoring error: ${err.message}`, 'error');
                    });
            }, 1000);

            return result;
        } else {
            throw new Error('No transaction hash received from submit endpoint');
        }
    } catch (error) {
        console.error('Swap execution error:', error);
        console.error('Error response data:', error.response?.data);
        throw new Error(`Failed to execute swap: ${error.response?.data?.message || error.message}`);
    }
}

// Helper function to split signature into v, r, s components
function splitSignature(signature) {
    // Remove the '0x' prefix if present
    const signatureWithoutPrefix = signature.startsWith('0x') ? signature.slice(2) : signature;

    // Extract r, s, v
    const r = '0x' + signatureWithoutPrefix.slice(0, 64);
    const s = '0x' + signatureWithoutPrefix.slice(64, 128);

    // v is the last byte, either 0, 1, 27, or 28
    let v = parseInt(signatureWithoutPrefix.slice(128, 130), 16);
    // Adjust v if needed (some wallets return 0/1, we need 27/28)
    if (v < 27) {
        v += 27;
    }

    return { r, s, v };
}

// Monitor the status of the swap transaction
// Monitor the status of the swap transaction
async function monitorSwapStatus(tradeHash, chainId) {
    logEvent(`Monitoring transaction status for hash: ${tradeHash}`, 'info');
    updateStatus('Monitoring transaction status...');
    console.log(`[DEBUG] monitorSwapStatus: Entered function - chainId type: ${typeof chainId}, value: ${chainId}`); // <<< ADD THIS LOG

    try {
        let attempts = 0;
        const maxAttempts = 10;
        const pollingInterval = 5000; // 5 seconds

        const checkStatus = async () => {
            attempts++;
            logEvent(`Checking status (attempt ${attempts})...`, 'info');

            try {
                const url = `${config.PROXY_SERVER_URL}/gasless/status/${tradeHash}`;
                const response = await axios.get(url, {
                    params: {
                        chainId: chainId
                    },
                    headers: {
                        '0x-api-key': config.ZERO_X_API.API_KEY,
                        '0x-version': config.ZERO_X_API.API_VERSION
                    }
                });

                if (response.data) {
                    const status = response.data.status || 'unknown';
                    logEvent(`Status update (attempt ${attempts}): ${status}`, 'info');
                    console.log('Status response:', response.data);

                    if (status === 'success') {
                        // Transaction confirmed
                        updateStatus('Swap completed successfully!');
                        logEvent('Swap transaction confirmed and successful!', 'success');

                        // Update balances after successful swap
                        await updateBalancesAfterSwap();

                        // Re-enable the swap button
                        document.getElementById('execute-swap').disabled = false;
                        return;
                    } else if (status === 'failed') {
                        // Transaction failed
                        const errorMsg = response.data.error || 'Unknown error';
                        updateStatus(`Swap failed: ${errorMsg}`);
                        logEvent(`Swap transaction failed: ${errorMsg}`, 'error');

                        // Re-enable the swap button
                        document.getElementById('execute-swap').disabled = false;
                        return;
                    } else if (status === 'pending') {
                        logEvent(`Transaction is still pending. Waiting...`, 'info');
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