"use client";

/**
 * SuiProvider — the wallet/runtime context for the whole app.
 *
 * Stacks the three providers dapp-kit needs:
 *   - QueryClientProvider  (dapp-kit's hooks are built on react-query)
 *   - SuiClientProvider    (RPC endpoints; defaults to mainnet, the network the
 *                           app's Walrus/MemWal account lives on)
 *   - WalletProvider       (wallet discovery + connection, autoConnect on)
 *
 * Mounted once in the root layout, around everything. Client-only.
 */

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "@mysten/dapp-kit/dist/index.css";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" },
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" },
});

const DEFAULT_NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") || "mainnet";

export function SuiProvider({ children }: { children: ReactNode }) {
  // One QueryClient per mount, kept stable across re-renders.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
