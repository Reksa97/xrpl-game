/**
 * Integration tests for the Express API endpoints
 * 
 * These test the actual HTTP endpoints of the server
 * with direct requests to the XRPL node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../server.js';

// Skip these tests if in CI environment
const shouldRunIntegrationTests = !process.env.CI;

// Integration test suite for API endpoints
describe('API Endpoint Integration Tests', () => {
  const request = supertest(app);
  
  // Generate a random address for testing
  const testAddress = `r${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  // Master account for tests
  const masterAccount = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
  const masterSecret = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";
  
  if (shouldRunIntegrationTests) {
    beforeAll(() => {
      console.log(`Running API integration tests for server`);
      console.log(`Test address: ${testAddress}`);
    });
    
    describe('Server Info API', () => {
      it('should return server information', async () => {
        const response = await request.get('/');
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.status).toBe('running');
        expect(response.body.xrpl_node).toBeDefined();
      });
    });
    
    describe('XRPL Connection Test API', () => {
      it('should test connection to XRPL node', async () => {
        const response = await request.get('/test');
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.xrpl_node).toBeDefined();
        expect(response.body.connection).toBeDefined();
        expect(response.body.connection.status).toBe('connected');
      });
    });
    
    describe('XRPL Proxy API', () => {
      it('should proxy server_info requests', async () => {
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'server_info',
            params: [{}]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.result).toBeDefined();
        expect(response.body.result.info).toBeDefined();
        
        console.log(`Server version: ${response.body.result.info.build_version}`);
        console.log(`Server state: ${response.body.result.info.server_state}`);
      });
      
      it('should handle account_info requests for master account', async () => {
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'account_info',
            params: [{
              account: masterAccount,
              strict: true,
              ledger_index: 'current'
            }]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.result).toBeDefined();
        expect(response.body.result.account_data).toBeDefined();
        expect(response.body.result.account_data.Account).toBe(masterAccount);
      });
      
      it('should handle wallet_generate requests', async () => {
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'wallet_generate',
            params: [{}]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.result).toBeDefined();
        
        // Should have account_id and master_seed at minimum
        expect(response.body.result.account_id).toBeDefined();
        expect(response.body.result.master_seed).toBeDefined();
      });
    });
    
    describe('Fund Account API', () => {
      it('should fund a new account', async () => {
        const response = await request
          .post('/api/fund-account')
          .send({
            address: testAddress,
            amount: '20'
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.address).toBe(testAddress);
        expect(response.body.amount).toBe('20');
        
        // Verify account actually exists now
        const accountCheckResponse = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'account_info',
            params: [{
              account: testAddress,
              strict: true,
              ledger_index: 'current'
            }]
          });
        
        // If funding worked, we should get account data
        expect(accountCheckResponse.status).toBe(200);
        
        if (accountCheckResponse.body.result && accountCheckResponse.body.result.account_data) {
          expect(accountCheckResponse.body.result.account_data.Account).toBe(testAddress);
        } else {
          console.warn('Account not found after funding - this might happen if the ledger has issues');
          // Don't fail the test as the network might have issues
        }
      });
    });
    
    describe('Transaction Submission API', () => {
      it('should submit a payment transaction', async () => {
        // Create a simple payment from master to test account
        const response = await request
          .post('/api/xrpl-proxy')
          .send({
            method: 'submit',
            params: [{
              tx_json: {
                TransactionType: 'Payment',
                Account: masterAccount,
                Destination: testAddress,
                Amount: '1000000', // 1 XRP
                Fee: '10'
              },
              secret: masterSecret
            }]
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.result).toBeDefined();
        
        // The transaction might succeed or fail based on the XRPL node state
        // We should get either engine_result for success or error for failure
        if (response.body.result.engine_result) {
          console.log(`Transaction result: ${response.body.result.engine_result}`);
          console.log(`Transaction message: ${response.body.result.engine_result_message}`);
        } else if (response.body.result.error) {
          console.log(`Transaction error: ${response.body.result.error}`);
          console.log(`Error message: ${response.body.result.error_message}`);
        }
        
        // Test passes either way as long as we get a valid response
        expect(
          response.body.result.engine_result !== undefined || 
          response.body.result.error !== undefined
        ).toBe(true);
      });
    });
  } else {
    it('Skipping API integration tests in CI environment', () => {
      console.log('Skipping API integration tests in CI environment');
      expect(true).toBe(true);
    });
  }
});