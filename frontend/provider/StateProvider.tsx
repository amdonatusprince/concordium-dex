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
import React from "react";
import { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";
import { useWallet } from "./WalletProvider";

interface UnbondingInfo {
  amount: string;
  unlock_time: string;
}

interface StakerInfo {
  last_reward_timestamp: string;
  pending_rewards: string;
  slashed: boolean;
  staked_amount: string;
  unbonding: UnbondingInfo[];
}

interface Context {
  stakerInfo: StakerInfo | null;
  setStakerInfo: React.Dispatch<React.SetStateAction<StakerInfo | null>>;
  stakeState: any;
  setStakeState: React.Dispatch<React.SetStateAction<any>>;
  loadingUserStakeInfo: boolean;
  setLoadingUserStakeInfo: React.Dispatch<React.SetStateAction<boolean>>;
  loadingProtocolStats: boolean;
  setLoadingProtocolStats: React.Dispatch<React.SetStateAction<boolean>>;
  getStakerInfo: (
    rpc: ConcordiumGRPCClient,
    account: string,
    contract: any
  ) => Promise<void>;
  viewState: (rpc: ConcordiumGRPCClient, contract: any) => Promise<void>;
}
const StateContext = createContext<Context>({
  stakerInfo: {
    last_reward_timestamp: "",
    pending_rewards: "",
    slashed: false,
    staked_amount: "",
    unbonding: [
      {
        amount: "",
        unlock_time: "",
      },
    ],
  },
  setStakerInfo: () => {},
  stakeState: {
    active_stakers: 0,
    stakers_length: 0,
    total_rewards_paid: "0",
    total_staked: "0",
  },
  setStakeState: () => {},
  loadingUserStakeInfo: false,
  setLoadingUserStakeInfo: () => false,
  loadingProtocolStats: false,
  setLoadingProtocolStats: () => false,
  getStakerInfo: async () => {},
  viewState: async () => {},
});

interface State {
  children: React.ReactNode;
}
const StateProvider = ({ children }: State) => {
  const [stakerInfo, setStakerInfo] = useState<StakerInfo | null>(null);
  const [loadingUserStakeInfo, setLoadingUserStakeInfo] = useState(false);
  const [loadingProtocolStats, setLoadingProtocolStats] = useState(false);
  const [stakeState, setStakeState] = useState<any>({
    active_stakers: 0,
    stakers_length: 0,
    total_rewards_paid: "0",
    total_staked: "0",
  });

  const { rpc, connection, account } = useWallet();

  const getStakerInfo = async (
    rpc: ConcordiumGRPCClient,
    account: string,
    contract: any
  ) => {
    const receiveName = "view_staker_info";

    try {
      setLoadingUserStakeInfo(true);
      if (contract) {
        const contract_schema = await rpc?.getEmbeddedSchema(
          contract?.sourceModule
        );

        const serializedParameter = serializeUpdateContractParameters(
          ContractName.fromString(CONTRACT_NAME),
          EntrypointName.fromString(receiveName),
          account,
          contract_schema,
          SchemaVersion.V1
        );

        const result = await rpc?.invokeContract({
          contract: contract && ContractAddress?.create(contract?.index, 0),
          method:
            contract &&
            ReceiveName?.create(
              contract?.name,
              EntrypointName?.fromString(receiveName)
            ),
          energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
          invoker: AccountAddress?.fromJSON(account),
          parameter: serializedParameter,
        });
        const buffer = Buffer.from(result.returnValue?.buffer as Uint8Array);
        const newschema = Buffer?.from(contract_schema).buffer;

        const name = ContractName?.fromString(CONTRACT_NAME);
        const entry_point = EntrypointName?.fromString(receiveName);

        const values = await deserializeReceiveReturnValue(
          buffer,
          contract_schema,
          name,
          entry_point,
          SchemaVersion?.V1
        );
        console.log(values);
        // const data = values?.Some[0] || values?.None;

        let data;
        if (values?.Some) {
          data = values?.Some[0];
        }

        console.log("Extracted data:", data);

        setLoadingUserStakeInfo(false);
        setStakerInfo(data);
        toast.success("User Stake Information fetched successfully");
        // return values as string;
      }
    } catch (err) {
      setLoadingUserStakeInfo(false);
      console.error("Error fetching user stake information:", err);
      toast.error("Error fetching user stake information");
    }
  };

  const viewState = async (rpc: ConcordiumGRPCClient, contract: any) => {
    const receiveName = "view_state";

    try {
      setLoadingProtocolStats(true);
      if (contract) {
        console.log(contract);
        const contract_schema = await rpc?.getEmbeddedSchema(
          contract?.sourceModule
        );

        const result = await rpc?.invokeContract({
          contract: contract && ContractAddress?.create(contract?.index, 0),
          method:
            contract &&
            ReceiveName?.create(
              contract?.name,
              EntrypointName?.fromString(receiveName)
            ),
          energy: Energy.create(MAX_CONTRACT_EXECUTION_ENERGY),
          // invoker: AccountAddress?.fromJSON(account),
          // parameter: serializedParameter,
        });
        console.log(result.returnValue);
        const buffer = Buffer.from(result.returnValue?.buffer as Uint8Array);
        const newschema = Buffer?.from(contract_schema).buffer;

        console.log(newschema);
        const name = ContractName?.fromString(CONTRACT_NAME);
        const entry_point = EntrypointName?.fromString(receiveName);
        console.log(contract_schema);

        const values = await deserializeReceiveReturnValue(
          buffer,
          contract_schema,
          name,
          entry_point,
          SchemaVersion?.V1
        );

        console.log(values);

        setStakeState(values);

        setLoadingProtocolStats(false);

        toast.success("Protocol statistics fetched successfully");

        // return values as string;
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setLoadingProtocolStats(false);
      toast.error("Error fetching protocol statistics");
    }
  };
  return (
    <StateContext.Provider
      value={{
        stakerInfo,
        setStakerInfo,
        loadingUserStakeInfo,
        setLoadingUserStakeInfo,
        loadingProtocolStats,
        setLoadingProtocolStats,
        getStakerInfo,
        viewState,
        stakeState,
        setStakeState,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export default StateProvider;

export const useStateProvider = () => {
  return useContext(StateContext);
};
