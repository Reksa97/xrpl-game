/**
 * Creature Crafter SDK Type Definitions
 */

import { Wallet } from 'xrpl';

export type Network = 'testnet' | 'devnet' | 'mainnet';

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

export declare class CreatureCrafterSDK {
  constructor(network?: Network);
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createTestWallet(): Promise<Wallet>;
  buyEgg(wallet: Wallet, eggShopAddress: string, priceXRP?: string): Promise<any>;
  getOwnedNFTs(address: string): Promise<NFT[]>;
  mintNFT(issuerWallet: Wallet, uri: string, transferFee?: number, flags?: number): Promise<any>;
  findBattle(address: string, petId: string, matchmakerUrl: string): Promise<BattleResult>;
  claimReward(wallet: Wallet, amount: number): Promise<any>;
  getBalance(address: string): Promise<string>;
}

export declare const sdk: CreatureCrafterSDK;

export { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';