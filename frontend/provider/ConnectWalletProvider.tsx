"use client";
import {
  TESTNET,
  WithWalletConnector,
  MAINNET,
} from "@concordium/react-components";
import React, { ReactNode } from "react";
import WalletProvider from "./WalletProvider";


interface ConnectWalletProps {
  children: ReactNode;
}
const ConnectWalletProvider: React.FC<ConnectWalletProps> = ({ children }) => {
  return (
    <WithWalletConnector network={TESTNET}>
      {(walletProps) => (
        <WalletProvider walletProps={walletProps}>{children}</WalletProvider>
      )}
    </WithWalletConnector>
  );
};

export default ConnectWalletProvider;
