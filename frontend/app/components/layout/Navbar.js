"use client";
import Image from "next/image";
import DEX from "../../../public/DEX.png";
import Link from "next/link";
import { useWallet } from "@/provider/WalletProvider";

export default function Navbar() {
  const { connect, account, contract, rpc, connection } = useWallet();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src={DEX}
                alt="DEX Logo"
                width={32}
                height={32}
                className="mr-2"
              />
              <span className="text-xl font-bold text-indigo-600">DEX</span>
            </Link>
          </div>

          {/* Connect Wallet Button */}

          {!account ? (
            <button
              onClick={() => connect?.()}
              className="
                      bg-indigo-600 text-white 
                      px-4 py-2 rounded-lg
                      hover:bg-indigo-700 
                      transition-colors duration-200
                      font-medium
                    "
            >
              Connect Wallet
            </button>
          ) : (
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
              Wallet Connected
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
