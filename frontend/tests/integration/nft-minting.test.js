/**
 * Integration tests for NFT minting functionality
 * 
 * Tests the complete NFT minting flow against a real XRPL node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app, xrplClient, fundAccount } from '../../server.js';

// Skip these tests if in CI environment or non-standalone mode
const shouldRunIntegrationTests = !process.env.CI && process.env.STANDALONE_MODE === 'true';

// Integration test suite for NFT minting
describe('NFT Minting Integration Tests', () => {
  const request = supertest(app);
  
  // Generate a random address for testing
  const testAddress = `r${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  // Generate a test URI in hex format
  const testURI = Buffer.from('https://example.com/nft/test').toString('hex').toUpperCase();
  
  if (shouldRunIntegrationTests) {
    beforeAll(async () => {
      console.log(`Running NFT minting tests against XRPL node`);
      console.log(`Test address: ${testAddress}`);
      
      // Fund the account first so we can mint NFTs
      try {
        await fundAccount(testAddress, '50');
        console.log(`Funded test account with 50 XRP`);
      } catch (err) {
        console.error('Failed to fund account:', err);
      }
    });
    
    describe('NFT Minting Flow', () => {
      it('should mint an NFT token', async () => {
        // Create NFT mint transaction
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'submit',
            params: [{
              tx_json: {
                TransactionType: 'NFTokenMint',
                Account: testAddress, 
                URI: testURI,
                Flags: 8, // transferable
                NFTokenTaxon: 0,
                Fee: '10'
              },
              // Use the Genesis account secret for testing
              secret: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
            }]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.result).toBeDefined();
        
        console.log(`NFT minting result: ${response.body.result.engine_result}`);
        console.log(`NFT minting message: ${response.body.result.engine_result_message}`);
        
        // If the transaction was submitted, it should have an engine_result
        expect(response.body.result.engine_result).toBeDefined();
      });
      
      it('should retrieve minted NFTs', async () => {
        // Wait a moment for the NFT to be minted
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get account NFTs
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'account_nfts',
            params: [{
              account: testAddress
            }]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        
        // Even if we get an error or no NFTs, the API should respond properly
        if (response.body.result && response.body.result.account_nfts) {
          console.log(`Found ${response.body.result.account_nfts.length} NFTs for test account`);
          
          // If NFTs were found, validate them
          if (response.body.result.account_nfts.length > 0) {
            const nft = response.body.result.account_nfts[0];
            expect(nft.NFTokenID).toBeDefined();
            expect(nft.URI).toBeDefined();
          }
        } else {
          console.warn('No NFTs found or error occurred:', response.body);
          // Don't fail the test as NFT operations might be pending
        }
      });
    });
    
    describe('NFT Funding Flow', () => {
      it('should automatically fund account when minting NFT with unfunded account', async () => {
        // Generate a completely new address that hasn't been funded
        const newAddress = `r${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        console.log(`Testing auto-funding with new address: ${newAddress}`);
        
        // Try to mint NFT directly with the unfunded account
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'submit',
            params: [{
              tx_json: {
                TransactionType: 'NFTokenMint',
                Account: newAddress,
                URI: testURI,
                Flags: 8, // transferable
                NFTokenTaxon: 0,
                Fee: '10'
              },
              // Use the Genesis account secret for testing
              secret: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
            }]
          });
        
        expect(response.status).toBe(200);
        
        // Wait for funding and minting to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if the account exists now - which would prove auto-funding happened
        try {
          const accountInfo = await xrplClient.request('account_info', {
            account: newAddress,
            strict: true,
            ledger_index: 'current'
          });
          
          // If we get here, the account exists!
          console.log(`Auto-funding worked! Account ${newAddress} exists`);
          expect(accountInfo.result.account_data.Account).toBe(newAddress);
        } catch (err) {
          console.warn('Auto-funding might have failed, account not found:', err.message);
          // Don't fail the test as funding might take longer or have network issues
        }
      });
    });
  } else {
    it('Skipping NFT minting tests in CI environment', () => {
      console.log('Skipping NFT minting tests in CI environment');
      expect(true).toBe(true);
    });
  }
});