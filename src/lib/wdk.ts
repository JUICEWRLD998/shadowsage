/**
 * WDK wallet service — browser-safe self-custodial wallet interface.
 *
 * WDK is seed-phrase-based, so the browser integration is:
 *   1. Generate or restore a seed phrase
 *   2. Store it encrypted in localStorage (user's device only)
 *   3. Derive accounts on demand
 *   4. Sign messages/transactions with derived keys
 *
 * The seed phrase NEVER leaves the browser. No server, no cloud backup — pure
 * self-custody. If the user clears browser data, their wallet is gone unless
 * they backed up the seed phrase themselves.
 *
 * Browser only (client-side).
 */

// Type stubs for WDK — these will be properly typed once the packages install.
// The actual WDK types come from @tetherto/wdk and @tetherto/wdk-wallet-evm.
type WDKInstance = any;
type WDKAccount = any;
type WDKWalletManagerEvm = any;

// Browser storage key for the encrypted seed phrase.
const STORAGE_KEY = "shadowsage_wdk_seed";
const STORAGE_VERSION = "v1";

// Simple XOR-based obfuscation (NOT cryptographic encryption — just makes it
// non-obvious in devtools). Real apps should use WebCrypto AES-GCM with a
// user-provided password, but that requires a password UI flow which is out
// of scope for the initial WDK integration.
function obfuscate(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return btoa(result);
}

function deobfuscate(encoded: string, key: string): string {
  const text = atob(encoded);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return result;
}

// Static obfuscation key (stored in code). A real app would derive this from
// a user password or use proper encryption. This is just defence-in-depth so
// the seed phrase isn't stored in plain text in localStorage.
const OBFUSCATION_KEY = "shadowsage-local-wallet-2024";

interface StoredWallet {
  version: string;
  seed: string; // obfuscated
  createdAt: number;
}

/**
 * WDK wallet manager for browser environments.
 * Handles seed phrase storage, account derivation, and signing.
 */
export class WDKWalletService {
  private wdk: WDKInstance | null = null;
  private seedPhrase: string | null = null;
  private account: WDKAccount | null = null;
  private address: string | null = null;

  /**
   * Check if a wallet exists in browser storage.
   */
  hasStoredWallet(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Generate a new wallet with a random seed phrase.
   * Stores it in browser localStorage (obfuscated).
   */
  async createWallet(): Promise<{ address: string; seedPhrase: string }> {
    if (typeof window === "undefined") {
      throw new Error("WDK wallet can only be created in the browser.");
    }

    // Dynamic import to avoid server-side execution
    const WDK = (await import("@tetherto/wdk")).default;
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;

    // Generate a new 12-word seed phrase
    this.seedPhrase = WDK.getRandomSeedPhrase(12);

    // Initialize WDK with the seed
    this.wdk = new WDK(this.seedPhrase).registerWallet(
      "ethereum",
      WalletManagerEvm,
      {
        provider:
          process.env.NEXT_PUBLIC_WDK_EVM_PROVIDER ||
          "https://eth.llamarpc.com",
      },
    );

    // Derive the first account (index 0)
    this.account = await this.wdk.getAccount("ethereum", 0);
    this.address = await this.account.getAddress();

    // Store the seed phrase (obfuscated)
    const stored: StoredWallet = {
      version: STORAGE_VERSION,
      seed: obfuscate(this.seedPhrase, OBFUSCATION_KEY),
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    return {
      address: this.address,
      seedPhrase: this.seedPhrase,
    };
  }

  /**
   * Restore a wallet from a seed phrase.
   * Stores it in browser localStorage (obfuscated).
   */
  async restoreWallet(seedPhrase: string): Promise<{ address: string }> {
    if (typeof window === "undefined") {
      throw new Error("WDK wallet can only be restored in the browser.");
    }

    // Dynamic import
    const WDK = (await import("@tetherto/wdk")).default;
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;

    // Validate the seed phrase format (BIP-39 expects 12 or 24 words)
    const words = seedPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      throw new Error("Seed phrase must be 12 or 24 words.");
    }

    this.seedPhrase = seedPhrase;

    // Initialize WDK
    this.wdk = new WDK(this.seedPhrase).registerWallet(
      "ethereum",
      WalletManagerEvm,
      {
        provider:
          process.env.NEXT_PUBLIC_WDK_EVM_PROVIDER ||
          "https://eth.llamarpc.com",
      },
    );

    this.account = await this.wdk.getAccount("ethereum", 0);
    this.address = await this.account.getAddress();

    // Store it
    const stored: StoredWallet = {
      version: STORAGE_VERSION,
      seed: obfuscate(this.seedPhrase, OBFUSCATION_KEY),
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    return { address: this.address };
  }

  /**
   * Connect to the stored wallet (unlock it from localStorage).
   */
  async connect(): Promise<{ address: string }> {
    if (typeof window === "undefined") {
      throw new Error("WDK wallet can only be connected in the browser.");
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      throw new Error("No wallet found. Create or restore a wallet first.");
    }

    const stored = JSON.parse(raw) as StoredWallet;
    if (stored.version !== STORAGE_VERSION) {
      throw new Error("Stored wallet version mismatch. Please restore your seed phrase.");
    }

    this.seedPhrase = deobfuscate(stored.seed, OBFUSCATION_KEY);

    // Dynamic import
    const WDK = (await import("@tetherto/wdk")).default;
    const WalletManagerEvm = (await import("@tetherto/wdk-wallet-evm")).default;

    this.wdk = new WDK(this.seedPhrase).registerWallet(
      "ethereum",
      WalletManagerEvm,
      {
        provider:
          process.env.NEXT_PUBLIC_WDK_EVM_PROVIDER ||
          "https://eth.llamarpc.com",
      },
    );

    this.account = await this.wdk.getAccount("ethereum", 0);
    this.address = await this.account.getAddress();

    return { address: this.address };
  }

  /**
   * Get the current wallet address (must be connected first).
   */
  getAddress(): string {
    if (!this.address) {
      throw new Error("Wallet not connected. Call connect() first.");
    }
    return this.address;
  }

  /**
   * Sign a message with the wallet's private key.
   * Returns the signature as a hex string.
   */
  async signMessage(message: string): Promise<string> {
    if (!this.account) {
      throw new Error("Wallet not connected. Call connect() first.");
    }

    const messageBytes = new TextEncoder().encode(message);

    // WDK sign method returns a signature buffer/string
    const signature = await this.account.sign(messageBytes);

    // Ensure it's a hex string (WDK might return a Buffer or Uint8Array)
    if (typeof signature === "string") {
      return signature.startsWith("0x") ? signature : `0x${signature}`;
    }

    // Convert Buffer/Uint8Array to hex
    const bytes = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Get the wallet balance (native token, e.g., ETH).
   * Returns the balance as a bigint (wei for Ethereum).
   */
  async getBalance(): Promise<bigint> {
    if (!this.account) {
      throw new Error("Wallet not connected. Call connect() first.");
    }

    const balance = await this.account.getBalance();
    return BigInt(balance.toString());
  }

  /**
   * Disconnect the wallet (clears in-memory state but keeps localStorage).
   */
  disconnect(): void {
    if (this.wdk) {
      this.wdk.dispose();
    }
    this.wdk = null;
    this.account = null;
    this.address = null;
    this.seedPhrase = null;
  }

  /**
   * Delete the wallet from browser storage (irreversible unless user has backup).
   */
  deleteWallet(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    this.disconnect();
  }

  /**
   * Export the seed phrase (DANGEROUS — only show this in a secure UI).
   * User must back this up to recover their wallet.
   */
  exportSeedPhrase(): string {
    if (!this.seedPhrase) {
      // Try to read from storage if not in memory
      if (typeof window === "undefined") {
        throw new Error("Cannot export seed phrase on server.");
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        throw new Error("No wallet found.");
      }
      const stored = JSON.parse(raw) as StoredWallet;
      return deobfuscate(stored.seed, OBFUSCATION_KEY);
    }
    return this.seedPhrase;
  }
}

/**
 * Singleton instance for the app.
 * Usage:
 *   import { wdkWallet } from '@/lib/wdk';
 *   await wdkWallet.connect();
 *   const address = wdkWallet.getAddress();
 */
export const wdkWallet = new WDKWalletService();
