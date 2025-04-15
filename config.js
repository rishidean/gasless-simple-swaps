// config.js - Configuration for the 0x Gasless Swap app

// Browser-compatible configuration
const config = {
  // 0x API Configuration
  ZERO_X_API: {
    BASE_URL: "https://api.0x.org/gasless",
    PRICE_URL: "https://api.0x.org/gasless/price",
    QUOTE_URL: "https://api.0x.org/gasless/quote",
    SUBMIT_URL: "https://api.0x.org/gasless/submit",
    STATUS_URL: "https://api.0x.org/gasless/status",
    API_KEY: "ccaea9d8-cafa-4dcd-b6d5-3c95ae15538f",
    API_VERSION: "v2"
  },

  // Chain configurations - only include chains supported by 0x
  CHAINS: {
    ETHEREUM: {
      id: 1,
      name: "Ethereum Mainnet",
      rpc: "https://mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://etherscan.io",
      nativeToken: {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      },
    },
    BASE: {
      id: 8453,
      name: "Base",
      rpc: "https://base-mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://basescan.org",
      nativeToken: {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      },
    },
    POLYGON: {
      id: 137,
      name: "Polygon",
      rpc: "https://polygon-mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://polygonscan.com",
      nativeToken: {
        symbol: "POL",
        name: "POL",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
      },
    },
    OPTIMISM: {
      id: 10,
      name: "Optimism",
      rpc: "https://optimism-mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://optimistic.etherscan.io",
      nativeToken: {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      },
    },
    ARBITRUM: {
      id: 42161,
      name: "Arbitrum",
      rpc: "https://arbitrum-mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://arbiscan.io",
      nativeToken: {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      },
    },
    AVALANCHE: {
      id: 43114,
      name: "Avalanche C-Chain",
      rpc: "https://avalanche-mainnet.infura.io/v3/645bdccc7aa0459fa476e69ea07aa8e0",
      explorerUrl: "https://snowtrace.io",
      nativeToken: {
        symbol: "AVAX",
        name: "Avalanche",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
      },
    },
  },

  // Token configurations
  TOKENS: {
    USDC: {
      name: "USD Coin",
      decimals: 6,
      version: "2",
      symbol: "USDC",
      addresses: {
        BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        POLYGON: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        OPTIMISM: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        ARBITRUM: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        AVALANCHE: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        ETHEREUM: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    },
    DAI: {
      name: "Dai Stablecoin",
      decimals: 18,
      version: "1",
      symbol: "DAI",
      addresses: {
        BASE: "0x50C47525C143017431176112b604B2346e5197d2",
        POLYGON: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        OPTIMISM: "0xDA10009cBd5D07dd0CeCc66161FC93D517C2Ad9B",
        ARBITRUM: "0xDA10009cBd5D07dd0CeCc66161FC93D517C2Ad9B",
        ETHEREUM: "0x6b175474e89094c44da98b954eedeac495271d0f",
      },
    },
    USDT: {
      name: "Tether USD",
      decimals: 6,
      version: "1",
      symbol: "USDT",
      addresses: {
        BASE: "0x68bcc7F1190AF20e7b572BCfb431c3Ac10A936Ab",
        POLYGON: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        ETHEREUM: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
    },
    wETH: {
      name: "Wrapped Ether",
      decimals: 18,
      version: "1",
      symbol: "WETH",
      addresses: {
        BASE: "0x4200000000000000000000000000000000000006",
        POLYGON: "0x7ceB237478F94617678c6Ad0078A734207646a00",
        ETHEREUM: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      },
    },
    EURC: {
      name: "Euro Coin",
      decimals: 6,
      version: "1",
      symbol: "EURC",
      addresses: {
        BASE: "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42",
        ETHEREUM: "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c",
        AVALANCHE: "0xc891eb4cbdeff6e073e859e987815ed1505c2acd",
      },
    },
    POL: {
      name: "Polygon Native",
      decimals: 18,
      version: "1",
      symbol: "POL",
      addresses: {
        BASE: "0xb4562d269b543e0edf41673f755004a909d6a9a3",
        POLYGON: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        ETHEREUM: "0x455e53cbb86018ac2b8092fdcd39d8444affc3f6",
      },
    },
  },

  // Default values
  DEFAULT_RECIPIENT_ADDRESS: "0x7eac9f0Dcf81Ed413647D2B1c9b02620DA298A93",
  DEFAULT_AMOUNT: "5.00",
  DEFAULT_GAS_LIMIT: 1_500_000,
  DEFAULT_SOURCE_CHAIN: "BASE",
  DEFAULT_SOURCE_TOKEN: "USDC",
  DEFAULT_DESTINATION_CHAIN: "BASE",  // Same chain for gasless swaps
  DEFAULT_DESTINATION_TOKEN: "DAI",

  // Utility functions
  getChainById: function(chainId) {
    for (const chain in this.CHAINS) {
      if (this.CHAINS[chain].id === Number(chainId)) {
        return this.CHAINS[chain];
      }
    }
    return null;
  },

  getTokenAddressForChain: function(tokenSymbol, chainName) {
    if (this.TOKENS[tokenSymbol] && this.TOKENS[tokenSymbol].addresses[chainName]) {
      return this.TOKENS[tokenSymbol].addresses[chainName];
    }
    return null;
  },

  getTokensForChain: function(chainName) {
    const tokensForChain = {};

    for (const tokenSymbol in this.TOKENS) {
      if (this.TOKENS[tokenSymbol].addresses[chainName]) {
        tokensForChain[tokenSymbol] = this.TOKENS[tokenSymbol];
      }
    }

    return tokensForChain;
  }
};

// Proxy server URL for API requests
  PROXY_SERVER_URL: "/api",

// Make config available for both Node.js and browser environments
if (typeof window !== 'undefined') {
  window.config = config;
} else {
  module.exports = config;
}
