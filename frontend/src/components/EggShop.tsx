import React, { useState, useEffect } from 'react';
import type { Wallet } from '../xrpl-direct';
import { createTestWallet, buyEgg, getAccountInfo, loadStoredWallet } from '../xrpl-direct';

interface EggShopProps {
  onWallet: (wallet: Wallet) => void;
}

export default function EggShop({ onWallet }: EggShopProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<React.ReactNode>('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [buying, setBuying] = useState<boolean>(false);
  
  // Load wallet from localStorage on component mount and fetch balance
  useEffect(() => {
    const loadWallet = async () => {
      try {
        // Try to load wallet from localStorage
        const storedWallet = await loadStoredWallet();
        
        if (storedWallet) {
          console.log('Using stored wallet from localStorage');
          setWallet(storedWallet);
          onWallet(storedWallet);
          fetchBalance(storedWallet.address);
        }
      } catch (error) {
        console.error('Failed to load wallet from localStorage:', error);
      }
    };
    
    loadWallet();
  }, [onWallet]);
  
  // Fetch account balance when wallet is set
  useEffect(() => {
    if (wallet) {
      fetchBalance(wallet.address);
    }
  }, [wallet]);
  
  const [isFunding, setIsFunding] = useState<boolean>(false);
  
  const fundCurrentWallet = async () => {
    if (!wallet) return;
    
    try {
      setIsFunding(true);
      setError('');
      setBalance('Funding...');
      
      // Import the fundAccount function from xrpl-direct
      const { fundAccount } = await import('../xrpl-direct');
      
      // Fund the wallet with 25 XRP
      await fundAccount(wallet.address, '25');
      
      // Refresh balance after funding
      await fetchBalance(wallet.address);
      
      // Show success message
      setError(
        <div style={{ color: 'green', marginBottom: '10px' }}>
          Successfully funded your wallet with 25 XRP!
        </div>
      );
    } catch (err: any) {
      console.error('Failed to fund wallet:', err);
      
      // Format error message
      const errorLines = (err.message || 'Unknown error').split('\n');
      const formattedError = (
        <>
          <strong>Funding Error:</strong>
          <div style={{ color: 'red', marginBottom: '10px' }}>{errorLines[0]}</div>
          {errorLines.length > 1 && (
            <div style={{ fontSize: '0.9em', color: '#666', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {errorLines.slice(1).join('\n')}
            </div>
          )}
        </>
      );
      
      setError(formattedError);
    } finally {
      setIsFunding(false);
    }
  };
  
  const fetchBalance = async (address: string) => {
    try {
      setError('');
      // Create a temporary wallet object with just the address
      const tempWallet: Wallet = { address, seed: '' };
      const accountData = await getAccountInfo(tempWallet);
      
      // Convert from drops to XRP
      const xrpBalance = (parseInt(accountData.Balance) / 1000000).toFixed(2);
      setBalance(xrpBalance);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      
      // Check if this is an account not found error
      const isAccountNotFound = err.message && (
        err.message.includes('Account not found') || 
        err.message.includes('actNotFound') ||
        err.message.includes('needs to be funded')
      );
      
      // Format error message
      const errorLines = (err.message || 'Unknown error').split('\n');
      
      if (isAccountNotFound) {
        // Special handling for account not found - offer to fund
        const formattedError = (
          <>
            <div style={{ color: 'orange', marginBottom: '10px' }}>
              This account doesn't exist on the XRPL yet. It needs to be funded with XRP.
            </div>
            <button 
              onClick={fundCurrentWallet}
              disabled={isFunding}
              style={{ 
                padding: '5px 10px', 
                marginTop: '10px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isFunding ? 'not-allowed' : 'pointer'
              }}
            >
              {isFunding ? 'Funding...' : 'Fund with 25 XRP'}
            </button>
          </>
        );
        
        setError(formattedError);
      } else {
        // Generic error handling
        const formattedError = (
          <>
            <strong>XRPL Balance Error:</strong>
            <div style={{ color: 'red', marginBottom: '10px' }}>{errorLines[0]}</div>
            {errorLines.length > 1 && (
              <div style={{ fontSize: '0.9em', color: '#666', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                {errorLines.slice(1).join('\n')}
              </div>
            )}
          </>
        );
        
        setError(formattedError);
      }
      
      // Set a default balance for UI not to break
      setBalance('Not funded');
    }
  };
  
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Create a test wallet on XRPL
      const newWallet = await createTestWallet();
      console.log('Wallet created:', newWallet.address);
      setWallet(newWallet);
      onWallet(newWallet);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      
      // Format the error message for better readability
      const errorLines = (err.message || 'Unknown error').split('\n');
      const formattedError = (
        <>
          <strong>XRPL Connection Error:</strong>
          <div style={{ color: 'red', marginBottom: '10px' }}>{errorLines[0]}</div>
          {errorLines.length > 1 && (
            <div style={{ fontSize: '0.9em', color: '#666', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {errorLines.slice(1).join('\n')}
            </div>
          )}
        </>
      );
      
      // Set error as JSX element
      setError(formattedError as any);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBuyEgg = async (eggType: string, priceXRP: string) => {
    if (!wallet) {
      alert('Please connect a wallet first');
      return;
    }
    
    try {
      setBuying(true);
      setError('');
      
      // Buy the egg via XRPL transaction
      const result = await buyEgg(wallet, priceXRP);
      console.log('Buy egg result:', result);
      
      // Refresh balance after purchase
      await fetchBalance(wallet.address);
      
      alert(`Successfully purchased a ${eggType} egg! Check your NFTs soon.`);
    } catch (err: any) {
      console.error('Failed to buy egg:', err);
      
      // Format error message
      const errorLines = (err.message || 'Unknown error').split('\n');
      const formattedError = (
        <>
          <strong>XRPL Transaction Error:</strong>
          <div style={{ color: 'red', marginBottom: '10px' }}>{errorLines[0]}</div>
          {errorLines.length > 1 && (
            <div style={{ fontSize: '0.9em', color: '#666', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {errorLines.slice(1).join('\n')}
            </div>
          )}
        </>
      );
      
      setError(formattedError);
    } finally {
      setBuying(false);
    }
  };
  
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Creature Crafter - Egg Shop</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Connect Your Wallet</h2>
        {!wallet ? (
          <button 
            onClick={connectWallet} 
            disabled={loading}
            style={{ padding: '10px 20px', fontSize: '16px', marginRight: '10px' }}
          >
            {loading ? 'Connecting...' : 'Connect Test Wallet'}
          </button>
        ) : (
          <div>
            <p><strong>Wallet:</strong> {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 6)}</p>
            <p><strong>Balance:</strong> {balance} XRP</p>
          </div>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
      
      <div>
        <h2>Available Eggs</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '15px', 
            textAlign: 'center',
            width: '150px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f3ec78, #af4261)',
              margin: '0 auto 15px'
            }}></div>
            <h3>Fire Egg</h3>
            <p>10 XRP</p>
            <button 
              onClick={() => handleBuyEgg('Fire', '10')} 
              disabled={!wallet || buying}
            >
              {buying ? 'Buying...' : 'Buy Egg'}
            </button>
          </div>
          
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '15px', 
            textAlign: 'center',
            width: '150px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #4CA1AF, #2C3E50)',
              margin: '0 auto 15px'
            }}></div>
            <h3>Water Egg</h3>
            <p>5 XRP</p>
            <button 
              onClick={() => handleBuyEgg('Water', '5')} 
              disabled={!wallet || buying}
            >
              {buying ? 'Buying...' : 'Buy Egg'}
            </button>
          </div>
          
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '15px', 
            textAlign: 'center',
            width: '150px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #56ab2f, #a8e063)',
              margin: '0 auto 15px'
            }}></div>
            <h3>Earth Egg</h3>
            <p>8 XRP</p>
            <button 
              onClick={() => handleBuyEgg('Earth', '8')} 
              disabled={!wallet || buying}
            >
              {buying ? 'Buying...' : 'Buy Egg'}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
        <h3>XRPL Integration</h3>
        <p>This app connects to a private XRPL node at 34.88.230.243:51234 via a proxy server.</p>
        <p>Your wallet is generated locally using the XRPL.js library and stored in your browser's localStorage.</p>
        
        {wallet && (
          <div style={{ marginTop: '15px', padding: '10px', background: '#e9f7ef', borderRadius: '5px' }}>
            <h4>Your Wallet Details</h4>
            <p><strong>Address:</strong> {wallet.address}</p>
            <p><strong>Seed (Private Key):</strong> {wallet.seed}</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              In a production app, this seed would be securely stored in the device's secure keychain.
            </p>
          </div>
        )}
        
        <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
          Note: If you see connection errors, make sure the proxy server is running.
        </p>
        <pre style={{ margin: '5px 0', padding: '5px', background: '#eee', fontSize: '0.9em' }}>
          node server.js
        </pre>
      </div>
    </div>
  );
}