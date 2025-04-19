import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { xrplClient } from '../../server.js';

// Mock axios
vi.mock('axios');

describe('XRPL Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('request method', () => {
    it('should make a POST request to the XRPL node with the correct parameters', async () => {
      // Setup
      const mockResponse = {
        data: {
          result: {
            info: {
              server_state: 'normal',
              complete_ledgers: '32570-58890'
            }
          }
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      // Execute
      const response = await xrplClient.request('server_info');
      
      // Verify
      expect(axios.post).toHaveBeenCalledWith(xrplClient.baseUrl, {
        method: 'server_info',
        params: [{}]
      });
      
      expect(response).toEqual(mockResponse.data);
    });
    
    it('should handle errors correctly', async () => {
      // Setup
      const mockError = new Error('Network error');
      axios.post.mockRejectedValueOnce(mockError);
      
      // Execute & Verify
      await expect(xrplClient.request('server_info')).rejects.toThrow('Network error');
    });
    
    it('should pass parameters correctly to the request', async () => {
      // Setup
      const mockResponse = {
        data: {
          result: {
            account_data: {
              Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
              Balance: '100000000000',
              Sequence: 1
            }
          }
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const params = {
        account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        strict: true,
        ledger_index: 'current'
      };
      
      // Execute
      const response = await xrplClient.request('account_info', params);
      
      // Verify
      expect(axios.post).toHaveBeenCalledWith(xrplClient.baseUrl, {
        method: 'account_info',
        params: [params]
      });
      
      expect(response).toEqual(mockResponse.data);
    });
  });

  describe('submit method', () => {
    it('should submit a signed transaction blob', async () => {
      // Setup
      const mockResponse = {
        data: {
          result: {
            engine_result: 'tesSUCCESS',
            engine_result_message: 'The transaction was applied.',
            tx_blob: 'signed_tx_blob',
            tx_json: {
              Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
              TransactionType: 'Payment'
            }
          }
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      const txBlob = 'signed_tx_blob';
      
      // Execute
      const response = await xrplClient.submit(txBlob);
      
      // Verify
      expect(axios.post).toHaveBeenCalledWith(xrplClient.baseUrl, {
        method: 'submit',
        params: [{ tx_blob: txBlob }]
      });
      
      expect(response).toEqual(mockResponse.data);
    });
    
    it('should handle submission errors', async () => {
      // Setup
      const mockError = new Error('Submission failed');
      axios.post.mockRejectedValueOnce(mockError);
      
      const txBlob = 'signed_tx_blob';
      
      // Execute & Verify
      await expect(xrplClient.submit(txBlob)).rejects.toThrow('Submission failed');
    });
  });

  describe('advanceLedger method', () => {
    it('should send a ledger_accept request', async () => {
      // Setup
      const mockResponse = {
        data: {
          result: {
            ledger_hash: 'hash',
            ledger_index: 123
          }
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);
      
      // Execute
      const response = await xrplClient.advanceLedger();
      
      // Verify
      expect(axios.post).toHaveBeenCalledWith(xrplClient.baseUrl, {
        method: 'ledger_accept',
        params: [{}]
      });
      
      expect(response).toEqual(mockResponse.data);
    });
    
    it('should handle errors gracefully', async () => {
      // Setup
      const mockError = new Error('Ledger advancement failed');
      axios.post.mockRejectedValueOnce(mockError);
      
      // Execute
      const response = await xrplClient.advanceLedger();
      
      // Verify
      expect(response).toEqual({
        error: 'ledger_advancement_failed',
        error_message: 'Ledger advancement failed'
      });
    });
  });
});