import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitTransaction, signTransaction } from '../../server.js';
import { xrplClient } from '../../server.js';

// Mock the dependencies
vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    signTransaction: vi.fn(),
    xrplClient: {
      ...actual.xrplClient,
      request: vi.fn(),
      submit: vi.fn(),
      advanceLedger: vi.fn()
    }
  };
});

describe('Transaction Submission', () => {
  const mockTxJson = {
    TransactionType: 'Payment',
    Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    Amount: '1000000',
    Fee: '10'
  };
  
  const mockSecret = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb';
  const mockSignedTxBlob = 'mock_signed_tx_blob';
  
  const mockAccountInfoResponse = {
    result: {
      account_data: {
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Balance: '100000000000',
        Sequence: 42
      }
    }
  };
  
  const mockSubmitResponse = {
    result: {
      engine_result: 'tesSUCCESS',
      engine_result_message: 'The transaction was applied.',
      tx_blob: mockSignedTxBlob,
      tx_json: {
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        TransactionType: 'Payment'
      }
    }
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    signTransaction.mockReturnValue(mockSignedTxBlob);
    xrplClient.request.mockResolvedValue(mockAccountInfoResponse);
    xrplClient.submit.mockResolvedValue(mockSubmitResponse);
    xrplClient.advanceLedger.mockResolvedValue({ result: { status: 'success' } });
    
    // Mock setTimeout
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 123; // Timer id
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sign and submit a transaction', async () => {
    // Execute
    const result = await submitTransaction(mockTxJson, mockSecret);
    
    // Verify
    // Check that account info was fetched
    expect(xrplClient.request).toHaveBeenCalledWith('account_info', {
      account: mockTxJson.Account,
      strict: true,
      ledger_index: 'current'
    });
    
    // Check that transaction was signed with the sequence number
    const expectedTxToSign = {
      ...mockTxJson,
      Sequence: 42 // From account info response
    };
    
    expect(signTransaction).toHaveBeenCalledWith(expectedTxToSign, mockSecret);
    
    // Check that transaction was submitted
    expect(xrplClient.submit).toHaveBeenCalledWith(mockSignedTxBlob);
    
    // Check that the function returned the expected result
    expect(result).toBe(mockSubmitResponse);
  });
  
  it('should convert Amount to string if it is a number', async () => {
    // Setup
    const txWithNumericAmount = {
      ...mockTxJson,
      Amount: 1000000 // Number instead of string
    };
    
    // Execute
    await submitTransaction(txWithNumericAmount, mockSecret);
    
    // Verify
    const expectedTxToSign = {
      ...txWithNumericAmount,
      Sequence: 42,
      Amount: '1000000' // Converted to string
    };
    
    expect(signTransaction).toHaveBeenCalledWith(expectedTxToSign, mockSecret);
  });
  
  it('should throw an error if account not found', async () => {
    // Setup
    xrplClient.request.mockResolvedValue({
      result: {
        error: 'actNotFound',
        error_message: 'Account not found.'
      }
    });
    
    // Execute & Verify
    await expect(submitTransaction(mockTxJson, mockSecret))
      .rejects.toThrow(`Account ${mockTxJson.Account} not found`);
    
    // Verify no further actions were taken
    expect(signTransaction).not.toHaveBeenCalled();
    expect(xrplClient.submit).not.toHaveBeenCalled();
    expect(xrplClient.advanceLedger).not.toHaveBeenCalled();
  });
  
  it('should advance the ledger if transaction was successful', async () => {
    // Execute
    await submitTransaction(mockTxJson, mockSecret);
    
    // Verify
    expect(xrplClient.advanceLedger).toHaveBeenCalledTimes(2); // Once directly, once via setTimeout
  });
  
  it('should not advance the ledger if transaction failed', async () => {
    // Setup
    xrplClient.submit.mockResolvedValue({
      result: {
        engine_result: 'tecNO_ACCOUNT',
        engine_result_message: 'The source account does not exist.'
      }
    });
    
    // Execute
    await submitTransaction(mockTxJson, mockSecret);
    
    // Verify
    expect(xrplClient.advanceLedger).not.toHaveBeenCalled();
  });
  
  it('should handle errors gracefully during ledger advancement', async () => {
    // Setup
    xrplClient.advanceLedger.mockRejectedValue(new Error('Ledger advancement failed'));
    
    // Execute
    const result = await submitTransaction(mockTxJson, mockSecret);
    
    // Verify
    // Even if ledger advancement fails, the function should return the submit response
    expect(result).toBe(mockSubmitResponse);
  });
  
  it('should throw an error if signing fails', async () => {
    // Setup
    signTransaction.mockImplementation(() => {
      throw new Error('Signing error');
    });
    
    // Execute & Verify
    await expect(submitTransaction(mockTxJson, mockSecret))
      .rejects.toThrow('Signing error');
  });
  
  it('should throw an error if submission fails', async () => {
    // Setup
    xrplClient.submit.mockRejectedValue(new Error('Submission error'));
    
    // Execute & Verify
    await expect(submitTransaction(mockTxJson, mockSecret))
      .rejects.toThrow('Submission error');
  });
});