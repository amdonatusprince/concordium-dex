"use client";
import { CONTRACT_NAME, MAX_CONTRACT_EXECUTION_ENERGY } from "@/config";
import {
  AccountAddress,
  ConcordiumGRPCClient,
  ContractAddress,
  ContractName,
  deserializeReceiveReturnValue,
  Energy,
  EntrypointName,
  ReceiveName,
  SchemaVersion,
  serializeUpdateContractParameters,
} from "@concordium/web-sdk";
import React, { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";
import { useWallet } from "./WalletProvider";

// Types for the DEX contract
interface TokenPair {
  token0_address: string;
  token1_address: string;
  token0_id: number;
  token1_id: number;
}

interface LiquidityPool {
  token0_reserve: string;
  token1_reserve: string;
  total_shares: string;
}

interface UserShares {
  tokenPair: TokenPair;
  shares: string;
}

interface Context {
  pools: { [key: string]: LiquidityPool };
  setPools: React.Dispatch<React.SetStateAction<{ [key: string]: LiquidityPool }>>;
  userShares: { [key: string]: string };
  setUserShares: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  loadingPoolInfo: boolean;
  setLoadingPoolInfo: React.Dispatch<React.SetStateAction<boolean>>;
  loadingUserShares: boolean;
  setLoadingUserShares: React.Dispatch<React.SetStateAction<boolean>>;
  getPool: (
    rpc: ConcordiumGRPCClient,
    tokenPair: TokenPair,
    contract: any
  ) => Promise<void>;
  getShares: (
    rpc: ConcordiumGRPCClient,
    tokenPair: TokenPair,
    account: string,
    contract: any
  ) => Promise<void>;
}

const DexContext = createContext<Context>({
  pools: {},
  setPools: () => {},
  userShares: {},
  setUserShares: () => {},
  loadingPoolInfo: false,
  setLoadingPoolInfo: () => false,
  loadingUserShares: false,
  setLoadingUserShares: () => false,
  getPool: async () => {},
  getShares: async () => {},
});

interface Props {
  children: React.ReactNode;
}

const DexProvider = ({ children }: Props) => {
  const [pools, setPools] = useState<{ [key: string]: LiquidityPool }>({});
  const [userShares, setUserShares] = useState<{ [key: string]: string }>({});
  const [loadingPoolInfo, setLoadingPoolInfo] = useState(false);
  const [loadingUserShares, setLoadingUserShares] = useState(false);

  const { rpc, connection, account } = useWallet();

  const getPool = async (
    rpc: ConcordiumGRPCClient,
    tokenPair: TokenPair,
    contract: any
  ) => {
    try {
      setLoadingPoolInfo(true);
      if (contract) {
        const contract_schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

        const serializedParameter = serializeUpdateContractParameters(
          ContractName.fromString(CONTRACT_NAME),
          EntrypointName.fromString("getPool"),
          tokenPair,
          contract_schema,
          SchemaVersion.V1
        );

        const result = await rpc?.invokeContract({
          contract: ContractAddress?.create(contract?.index, 0),
          method: ReceiveName?.create(
            contract?.name,
            EntrypointName?.fromString("getPool")
          ),
          parameter: serializedParameter,
          energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        });

        const values = await deserializeReceiveReturnValue(
          Buffer.from(result.returnValue?.buffer as Uint8Array),
          contract_schema,
          ContractName?.fromString(CONTRACT_NAME),
          EntrypointName?.fromString("getPool"),
          SchemaVersion?.V1
        );

        if (values) {
          const poolKey = `${tokenPair.token0_address}-${tokenPair.token1_address}`;
          setPools(prev => ({ ...prev, [poolKey]: values }));
        }

        setLoadingPoolInfo(false);
        toast.success("Pool information fetched successfully");
      }
    } catch (err) {
      console.error("Error fetching pool information:", err);
      setLoadingPoolInfo(false);
      toast.error("Error fetching pool information");
    }
  };

  const getShares = async (
    rpc: ConcordiumGRPCClient,
    tokenPair: TokenPair,
    account: string,
    contract: any
  ) => {
    try {
      setLoadingUserShares(true);
      if (contract) {
        const contract_schema = await rpc?.getEmbeddedSchema(contract?.sourceModule);

        const serializedParameter = serializeUpdateContractParameters(
          ContractName.fromString(CONTRACT_NAME),
          EntrypointName.fromString("getShares"),
          { tokenPair, account },
          contract_schema,
          SchemaVersion.V1
        );

        const result = await rpc?.invokeContract({
          contract: ContractAddress?.create(contract?.index, 0),
          method: ReceiveName?.create(
            contract?.name,
            EntrypointName?.fromString("getShares")
          ),
          parameter: serializedParameter,
          energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        });

        const values = await deserializeReceiveReturnValue(
          Buffer.from(result.returnValue?.buffer as Uint8Array),
          contract_schema,
          ContractName?.fromString(CONTRACT_NAME),
          EntrypointName?.fromString("getShares"),
          SchemaVersion?.V1
        );

        if (values) {
          const poolKey = `${tokenPair.token0_address}-${tokenPair.token1_address}`;
          setUserShares(prev => ({ ...prev, [poolKey]: values }));
        }

        setLoadingUserShares(false);
        toast.success("User shares fetched successfully");
      }
    } catch (err) {
      console.error("Error fetching user shares:", err);
      setLoadingUserShares(false);
      toast.error("Error fetching user shares");
    }
  };

  return (
    <DexContext.Provider
      value={{
        pools,
        setPools,
        userShares,
        setUserShares,
        loadingPoolInfo,
        setLoadingPoolInfo,
        loadingUserShares,
        setLoadingUserShares,
        getPool,
        getShares,
      }}
    >
      {children}
    </DexContext.Provider>
  );
};

export default DexProvider;

export const useDexProvider = () => {
  return useContext(DexContext);
};
