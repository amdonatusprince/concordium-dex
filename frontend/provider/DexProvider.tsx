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

interface TokenPair {
  token0_address: string
  token1_address: string;
  token0_id: number;
  token1_id: number;
}

interface LiquidityPool {
  token0_reserve: string;
  token1_reserve: string;
  total_shares: string;
}

interface AddLiquidityParams {
  tokenPair: TokenPair;
  amount0: string;
  amount1: string;
  minLiquidity: string;
}

interface SwapParams {
  tokenPair: TokenPair;
  amountIn: string;
  minAmountOut: string;
  isToken0: boolean;
}

interface RemoveLiquidityParams {
  tokenPair: TokenPair;
  shares: string;
  minAmount0: string;
  minAmount1: string;
}

interface Context {
  pool: LiquidityPool | null;
  loadingPool: boolean;
  userShares: string;
  loadingShares: boolean;
  loadingTransaction: boolean;
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
  addLiquidity: (
    rpc: ConcordiumGRPCClient,
    params: AddLiquidityParams,
    contract: any
  ) => Promise<void>;
  swap: (
    rpc: ConcordiumGRPCClient,
    params: SwapParams,
    contract: any
  ) => Promise<void>;
  removeLiquidity: (
    rpc: ConcordiumGRPCClient,
    params: RemoveLiquidityParams,
    contract: any
  ) => Promise<void>;
}

const DexContext = createContext<Context>({
  pool: null,
  loadingPool: false,
  userShares: "0",
  loadingShares: false,
  loadingTransaction: false,
  getPool: async () => {},
  getShares: async () => {},
  addLiquidity: async () => {},
  swap: async () => {},
  removeLiquidity: async () => {},
});

interface Props {
  children: React.ReactNode;
}

const DexProvider = ({ children }: Props) => {
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const [userShares, setUserShares] = useState("0");
  const [loadingShares, setLoadingShares] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);

  const { rpc, connection, account } = useWallet();
  const getPool = async (
    rpc: ConcordiumGRPCClient,
    tokenPair: TokenPair,
    contract: any
  ) => {
    try {
      setLoadingPool(true);
      const contract_schema = await rpc?.getEmbeddedSchema(
        contract?.sourceModule
      );

      const serializedParameter = serializeUpdateContractParameters(
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("getPool"),
        tokenPair,
        contract_schema,
        SchemaVersion.V1
      );

      const result = await rpc.invokeContract({
        contract: ContractAddress.create(contract.index, 0),
        method: ReceiveName.create(
          contract.name,
          EntrypointName.fromString("getPool")
        ),
        energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        parameter: serializedParameter,
      });

      const values = await deserializeReceiveReturnValue(
        Buffer.from(result.returnValue?.buffer ?? ''),
        contract_schema,
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("getPool"),
        SchemaVersion.V1
      );

      setPool(values);
      setLoadingPool(false);
      toast.success("Pool information fetched successfully");
    } catch (err) {
      setLoadingPool(false);
      console.error("Error fetching pool:", err);
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
      setLoadingShares(true);
      const contract_schema = await rpc.getEmbeddedSchema(contract.sourceModule);

      const params = [tokenPair, AccountAddress.fromBase58(account)];
      const serializedParameter = serializeUpdateContractParameters(
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("getShares"),
        params,
        contract_schema,
        SchemaVersion.V1
      );

      const result = await rpc.invokeContract({
        contract: ContractAddress.create(contract.index, 0),
        method: ReceiveName.create(
          contract.name,
          EntrypointName.fromString("getShares")
        ),
        energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        parameter: serializedParameter,
      });

      const shares = await deserializeReceiveReturnValue(
        Buffer.from(result.returnValue?.buffer ?? ''),
        contract_schema,
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("getShares"),
        SchemaVersion.V1
      );

      setUserShares(shares.toString());
      setLoadingShares(false);
      toast.success("Shares fetched successfully");
    } catch (err) {
      setLoadingShares(false);
      console.error("Error fetching shares:", err);
      toast.error("Error fetching shares");
    }
  };

  const addLiquidity = async (
    rpc: ConcordiumGRPCClient,
    params: AddLiquidityParams,
    contract: any
  ) => {
    try {
      setLoadingTransaction(true);
      const contract_schema = await rpc.getEmbeddedSchema(contract.sourceModule);

      const serializedParameter = serializeUpdateContractParameters(
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("addLiquidity"),
        params,
        contract_schema,
        SchemaVersion.V1
      );

      const result = await rpc.invokeContract({
        contract: ContractAddress.create(contract.index, 0),
        method: ReceiveName.create(
          contract.name,
          EntrypointName.fromString("addLiquidity")
        ),
        energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        parameter: serializedParameter,
      });

      setLoadingTransaction(false);
      toast.success("Liquidity added successfully");
      
      // Refresh pool data
      await getPool(rpc, params.tokenPair, contract);
      if (account) {
        await getShares(rpc, params.tokenPair, account, contract);
      }
    } catch (err) {
      setLoadingTransaction(false);
      console.error("Error adding liquidity:", err);
      toast.error("Error adding liquidity");
    }
  };

  const removeLiquidity = async (
    rpc: ConcordiumGRPCClient,
    params: RemoveLiquidityParams,
    contract: any
  ) => {
    try {
      setLoadingTransaction(true);
      const contract_schema = await rpc.getEmbeddedSchema(contract.sourceModule);

      const serializedParameter = serializeUpdateContractParameters(
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("removeLiquidity"),
        params,
        contract_schema,
        SchemaVersion.V1
      );

      const result = await rpc.invokeContract({
        contract: ContractAddress.create(contract.index, 0),
        method: ReceiveName.create(
          contract.name,
          EntrypointName.fromString("removeLiquidity")
        ),
        energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        parameter: serializedParameter,
      });

      setLoadingTransaction(false);
      toast.success("Liquidity removed successfully");
      
      // Refresh pool data
      await getPool(rpc, params.tokenPair, contract);
      if (account) {
        await getShares(rpc, params.tokenPair, account, contract);
      }
    } catch (err) {
      setLoadingTransaction(false);
      console.error("Error removing liquidity:", err);
      toast.error("Error removing liquidity");
    }
  };

  const swap = async (
    rpc: ConcordiumGRPCClient,
    params: SwapParams,
    contract: any
  ) => {
    try {
      setLoadingTransaction(true);
      const contract_schema = await rpc.getEmbeddedSchema(contract.sourceModule);

      const serializedParameter = serializeUpdateContractParameters(
        ContractName.fromString(CONTRACT_NAME),
        EntrypointName.fromString("swap"),
        params,
        contract_schema,
        SchemaVersion.V1
      );

      const result = await rpc.invokeContract({
        contract: ContractAddress.create(contract.index, 0),
        method: ReceiveName.create(
          contract.name,
          EntrypointName.fromString("swap")
        ),
        energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
        parameter: serializedParameter,
      });

      setLoadingTransaction(false);
      toast.success("Swap executed successfully");
      
      // Refresh pool data
      await getPool(rpc, params.tokenPair, contract);
    } catch (err) {
      setLoadingTransaction(false);
      console.error("Error executing swap:", err);
      toast.error("Error executing swap");
    }
  };

  return (
    <DexContext.Provider
      value={{
        pool,
        loadingPool,
        userShares,
        loadingShares,
        loadingTransaction,
        getPool,
        getShares,
        addLiquidity,
        swap,
        removeLiquidity,
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

// Example usage in another component:
/*
import { useDexProvider } from './DexProvider';

const YourComponent = () => {
  const { 
    pool, 
    loadingPool, 
    userShares, 
    addLiquidity,
    swap,
    removeLiquidity 
  } = useDexProvider();

  const handleAddLiquidity = async () => {
    const params = {
      tokenPair: {
        token0_address: yourToken0Address,
        token1_address: yourToken1Address,
        token0_id: 0,
        token1_id: 0
      },
      amount0: "1000",
      amount1: "1000",
      minLiquidity: "100"
    };
    
    await addLiquidity(rpc, params, contract);
  };

  return (
    <div>
      {loadingPool ? (
        <div>Loading pool data...</div>
      ) : (
        <div>
          <div>Token0 Reserve: {pool?.token0_reserve}</div>
          <div>Token1 Reserve: {pool?.token1_reserve}</div>
          <div>Your Shares: {userShares}</div>
        </div>
      )}
    </div>
  );
};
*/
