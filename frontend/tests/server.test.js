import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../server.js';
import supertest from 'supertest';

const request = supertest(app);

// Test address
const testAddress = `r${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
console.log(`Test address for server tests: ${testAddress}`);

// Master account credentials
const masterAccount = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const masterSecret = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";

describe('Express Server API Tests', () => {
  it('GET / should return server info', async () => {
    const response = await request.get('/');
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('running');
    expect(response.body.xrpl_node).toBeDefined();
    expect(response.body.endpoints).toBeDefined();
  });
  
  it('GET /test should test XRPL connection', async () => {
    const response = await request.get('/test');
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.xrpl_node).toBeDefined();
    expect(response.body.connection.status).toBe('connected');
    expect(response.body.server_info).toBeDefined();
  });
  
  it('POST /api/xrpl-proxy should proxy server_info requests', async () => {
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
    expect(response.body.result.info.build_version).toBeDefined();
  });
  
  it('POST /api/xrpl-proxy should handle account_info requests', async () => {
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
  
  it('POST /api/fund-account should fund a new account', async () => {
    const response = await request
      .post('/api/fund-account')
      .send({
        address: testAddress,
        amount: '10'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(true);
    expect(response.body.address).toBe(testAddress);
    expect(response.body.amount).toBe('10');
    
    // We could check if the account now exists, but this would make the test slow
    // and might fail if the XRPL node is having issues
  });
  
  it('POST /api/xrpl-proxy should handle wallet_generate requests', async () => {
    const response = await request
      .post('/api/xrpl-proxy')
      .send({
        method: 'wallet_generate',
        params: [{}]
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.result).toBeDefined();
    expect(response.body.result.account_id).toBeDefined();
    expect(response.body.result.master_seed).toBeDefined();
  });
});