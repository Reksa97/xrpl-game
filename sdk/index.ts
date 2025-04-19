/**
 * Creature Crafter SDK
 *
 * A lightweight SDK for interacting with the XRPL blockchain for NFT-based games.
 */

import {
  Client,
  Wallet,
  xrpToDrops,
  dropsToXrp,
  NFTokenMint,
  AccountNFTs,
  Payment,
} from "xrpl";

export type Network = "testnet" | "devnet" | "mainnet";

export interface NFT {
  NFTokenID: string;
  URI?: string;
  Issuer?: string;
  SerialNumber?: number;
  Flags?: number;
}

export interface PetStats {
  strength: number;
  speed: number;
  intelligence: number;
  endurance: number;
}

export interface Pet {
  id: string;
  nftId: string;
  dna: string;
  stats: PetStats;
  owner: string;
}

export interface BattleResult {
  victory: boolean;
  reward: number;
}

export class CreatureCrafterSDK {
  private client: Client;

  constructor(network: Network = "testnet") {
    const networkURLs = {
      testnet: "wss://s.altnet.rippletest.net:51233",
      devnet: "wss://s.devnet.rippletest.net:51233",
      mainnet: "wss://xrplcluster.com",
    };

    this.client = new Client(networkURLs[network]);
  }

  /**
   * Connect to the XRPL
   */
  async connect(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from the XRPL
   */
  async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }

  /**
   * Create a new test wallet with funds (testnet only)
   */
  async createTestWallet(): Promise<Wallet> {
    await this.connect();
    const { wallet } = await this.client.fundWallet();
    return wallet;
  }

  /**
   * Buy an egg NFT by sending XRP to the egg shop address
   */
  async buyEgg(
    wallet: Wallet,
    eggShopAddress: string,
    priceXRP = "10"
  ): Promise<any> {
    await this.connect();

    const tx: Payment = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: eggShopAddress,
      Amount: xrpToDrops(priceXRP),
    };

    const prepared = await this.client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    return result;
  }

  /**
   * Get all NFTs owned by an address
   */
  async getOwnedNFTs(address: string): Promise<NFT[]> {
    await this.connect();

    const response = await this.client.request({
      command: "account_nfts",
      account: address,
    });

    return response.result.account_nfts;
  }

  stringToHex(str: string): string {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hex += charCode.toString(16).padStart(2, "0");
    }
    return hex.toUpperCase();
  }

  /**
   * Mint an NFT (for server-side use)
   */
  async mintNFT(
    issuerWallet: Wallet,
    uri: string,
    transferFee = 0,
    flags = 8
  ): Promise<any> {
    await this.connect();

    // Convert URI to hex
    const hexUri = this.stringToHex(uri);

    const tx: NFTokenMint = {
      TransactionType: "NFTokenMint",
      Account: issuerWallet.address,
      URI: hexUri,
      Flags: flags,
      TransferFee: transferFee,
      NFTokenTaxon: 0,
    };

    const prepared = await this.client.autofill(tx);
    const signed = issuerWallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    return result;
  }

  /**
   * Find a battle match (calls the matchmaker service)
   */
  async findBattle(
    address: string,
    petId: string,
    matchmakerUrl: string
  ): Promise<BattleResult> {
    const response = await fetch(`${matchmakerUrl}/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        pet_id: petId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to find battle");
    }

    return await response.json();
  }

  /**
   * Claim battle rewards by sending a transaction to the reward contract
   */
  async claimReward(wallet: Wallet, amount: number): Promise<any> {
    // This would implement the actual reward claiming
    // For now, it's just a placeholder
    return { claimed: true, amount };
  }

  /**
   * Get the XRP balance of an address
   */
  async getBalance(address: string): Promise<string> {
    await this.connect();

    const response = await this.client.request({
      command: "account_info",
      account: address,
    });

    return dropsToXrp(response.result.account_data.Balance);
  }
}

// Export singleton instance
export const sdk = new CreatureCrafterSDK();

// Export types and utility functions
export { Client, Wallet, xrpToDrops, dropsToXrp };
