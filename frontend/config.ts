import {
  BrowserWalletConnector,
  CONCORDIUM_WALLET_CONNECT_PROJECT_ID,
  persistentConnectorType,
  WalletConnectConnector,
} from "@concordium/react-components";

export const DEFAULT_CONTRACT_INDEX = BigInt(10312);
export const MAX_CONTRACT_EXECUTION_ENERGY = BigInt(30000);

export const CONTRACT_NAME = "dex_contract";
export const CONTRACT_SUB_INDEX = BigInt(0);
export const MICRO_CCD = 1000000;
// export const MODULE_REF = '8d880e189f5248b7ad83d7d2fdc3456461aef23bc4bf6a43af9a096199d0c462';




const WALLET_CONNECT_OPTS = {
  projectId: CONCORDIUM_WALLET_CONNECT_PROJECT_ID,
  metadata: {
    name: "DEX dApp",
    description: "Swap your CIS-2 tokens with ease",
    url: "#",
    icons: ["https://walletconnect.com/walletconnect-logo.png"],
  },
};

export const BROWSER_WALLET = persistentConnectorType(
  BrowserWalletConnector.create
);
export const WALLET_CONNECT = persistentConnectorType(
  WalletConnectConnector.create.bind(this, WALLET_CONNECT_OPTS)
);
