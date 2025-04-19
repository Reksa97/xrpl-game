import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTransaction, deriveKeypairFromSecret } from '../../server.js';
import * as rippleKeypairs from 'ripple-keypairs';

// Mock ripple-keypairs
vi.mock('ripple-keypairs', () => {
  return {
    deriveKeypair: vi.fn(),
    sign: vi.fn()
  };
});

describe('Transaction Signing', () => {
  const mockSecret = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb';
  const mockKeypair = {
    publicKey: 'mock_public_key',
    privateKey: 'mock_private_key'
  };
  const mockSignedTx = 'mock_signed_tx_blob';
  
  beforeEach(() => {
    vi.clearAllMocks();
    rippleKeypairs.deriveKeypair.mockReturnValue(mockKeypair);
    rippleKeypairs.sign.mockReturnValue(mockSignedTx);
  });
  
  describe('deriveKeypairFromSecret', () => {
    it('should derive a keypair from a secret', () => {
      // Execute
      const keypair = deriveKeypairFromSecret(mockSecret);
      
      // Verify
      expect(rippleKeypairs.deriveKeypair).toHaveBeenCalledWith(mockSecret);
      expect(keypair).toBe(mockKeypair);
    });
    
    it('should throw an error if keypair derivation fails', () => {
      // Setup
      rippleKeypairs.deriveKeypair.mockImplementation(() => {
        throw new Error('Invalid secret');
      });
      
      // Execute & Verify
      expect(() => deriveKeypairFromSecret(mockSecret)).toThrow('Unable to derive keypair from secret');
    });
  });
  
  describe('signTransaction', () => {
    it('should sign a transaction with the provided secret', () => {
      // Setup
      const txJson = {
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        TransactionType: 'Payment',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
        Sequence: 1,
        Fee: '10'
      };
      
      // Execute
      const signedTx = signTransaction(txJson, mockSecret);
      
      // Verify
      expect(rippleKeypairs.deriveKeypair).toHaveBeenCalledWith(mockSecret);
      
      // Check that signing was called with the transaction including SigningPubKey
      const expectedTxToSign = {
        ...txJson,
        SigningPubKey: mockKeypair.publicKey
      };
      
      expect(rippleKeypairs.sign).toHaveBeenCalledWith(
        JSON.stringify(expectedTxToSign),
        mockSecret
      );
      
      expect(signedTx).toBe(mockSignedTx);
    });
    
    it('should throw an error if signing fails', () => {
      // Setup
      rippleKeypairs.sign.mockImplementation(() => {
        throw new Error('Signing error');
      });
      
      const txJson = {
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        TransactionType: 'Payment',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
        Sequence: 1,
        Fee: '10'
      };
      
      // Execute & Verify
      expect(() => signTransaction(txJson, mockSecret)).toThrow('Failed to sign transaction: Signing error');
    });
  });
});