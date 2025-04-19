import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fundAccount, submitTransaction } from '../../server.js';
import { xrplClient } from '../../server.js';

// Mock the submitTransaction and xrplClient functions
vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    submitTransaction: vi.fn(),
    xrplClient: {
      ...actual.xrplClient,
      request: vi.fn(),
      advanceLedger: vi.fn()
    }
  };
});

describe('Account Funding', () => {
  const mockDestinationAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
  const mockAmount = '25';
  const mockMasterAccount = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  const mockMasterSecret = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb';
  
  const mockSubmitResponse = {
    result: {
      engine_result: 'tesSUCCESS',
      engine_result_message: 'The transaction was applied.',
      tx_json: {
        Account: mockMasterAccount,
        Destination: mockDestinationAddress,
        TransactionType: 'Payment'
      }
    }
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    submitTransaction.mockResolvedValue(mockSubmitResponse);
    xrplClient.advanceLedger.mockResolvedValue({ result: { status: 'success' } });
    xrplClient.request.mockResolvedValue({
      result: {
        account_data: {
          Account: mockDestinationAddress,
          Balance: '25000000'
        }
      }
    });
    
    // Add the missing method implementation from the mock
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 123; // Timer id
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fund an account with XRP', async () => {
    // Execute
    const result = await fundAccount(mockDestinationAddress, mockAmount);
    
    // Verify
    // Check that submitTransaction was called with the correct transaction
    expect(submitTransaction).toHaveBeenCalledWith({
      TransactionType: 'Payment',
      Account: mockMasterAccount,
      Destination: mockDestinationAddress,
      Amount: '25000000', // 25 XRP converted to drops
      Fee: '10'
    }, mockMasterSecret);
    
    // Check that ledger was advanced
    expect(xrplClient.advanceLedger).toHaveBeenCalledTimes(2);
    
    // Check that the account was verified
    expect(xrplClient.request).toHaveBeenCalledWith('account_info', {
      account: mockDestinationAddress,
      strict: true,
      ledger_index: 'current'
    });
    
    // Check the function returned the expected result
    expect(result).toEqual({
      success: true,
      destination: mockDestinationAddress,
      amount: mockAmount,
      result: mockSubmitResponse
    });
  });
  
  it('should handle transaction failure', async () => {
    // Setup
    submitTransaction.mockRejectedValue(new Error('Transaction failed'));
    
    // Execute & Verify
    await expect(fundAccount(mockDestinationAddress, mockAmount))
      .rejects.toThrow('Transaction failed');
  });
  
  it('should handle verification failure gracefully', async () => {
    // Setup
    xrplClient.request.mockRejectedValue(new Error('Account not found'));
    
    // Execute
    const result = await fundAccount(mockDestinationAddress, mockAmount);
    
    // Verify
    // Even if verification fails, the function should return success
    expect(result).toEqual({
      success: true,
      destination: mockDestinationAddress,
      amount: mockAmount,
      result: mockSubmitResponse
    });
  });
  
  it('should use default amount when not specified', async () => {
    // Execute
    await fundAccount(mockDestinationAddress);
    
    // Verify
    expect(submitTransaction).toHaveBeenCalledWith({
      TransactionType: 'Payment',
      Account: mockMasterAccount,
      Destination: mockDestinationAddress,
      Amount: '25000000', // Default 25 XRP converted to drops
      Fee: '10'
    }, mockMasterSecret);
  });
  
  it('should handle ledger advancement failure gracefully', async () => {
    // Setup
    xrplClient.advanceLedger.mockRejectedValue(new Error('Ledger advancement failed'));
    
    // Execute
    const result = await fundAccount(mockDestinationAddress, mockAmount);
    
    // Verify
    // Even if ledger advancement fails, the function should return success
    expect(result).toEqual({
      success: true,
      destination: mockDestinationAddress,
      amount: mockAmount,
      result: mockSubmitResponse
    });
  });
});