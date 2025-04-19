import React, { useState, useEffect, useRef } from 'react';
import type { Wallet } from '../xrpl-direct';
import { getOwnedNFTs, mintNFT } from '../xrpl-direct';

interface PetProps {
  wallet: Wallet;
}

interface NFT {
  NFTokenID: string;
  URI?: string;
  Issuer?: string;
  SerialNumber?: number;
  Flags?: number;
  isNew?: boolean; // Flag for newly minted NFTs
}

export default function Pet({ wallet }: PetProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [hatching, setHatching] = useState<boolean>(false);
  const [pet, setPet] = useState<any>(null);
  const [mintingStatus, setMintingStatus] = useState<string>('');
  const [lastMintedTokenId, setLastMintedTokenId] = useState<string | null>(null);
  const prevNftCountRef = useRef<number>(0);
  
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        
        // In standalone mode, we mint to the master account
        // So we need to fetch NFTs from both the wallet address and the master account
        const masterAccount = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
        const isMasterAccount = wallet.address === masterAccount;
        
        // Always check the master account in standalone mode since that's where NFTs are minted
        console.log(`Fetching NFTs from ${isMasterAccount ? 'master account' : 'both wallet and master account'}`);
        const ownedNFTs = await getOwnedNFTs(masterAccount);
        
        // Compare with previous count to detect new NFTs
        const currentCount = ownedNFTs.length;
        const prevCount = prevNftCountRef.current;
        
        console.log(`Found ${currentCount} NFTs (previously had ${prevCount})`);
        
        // Mark new NFTs if count increased (and we're not initializing)
        if (prevCount > 0 && currentCount > prevCount) {
          const enhancedNFTs = ownedNFTs.map(nft => ({
            ...nft,
            // Mark as new if it matches our last minted token ID or if we don't have a specific ID
            isNew: lastMintedTokenId ? nft.NFTokenID === lastMintedTokenId : true
          }));
          setNfts(enhancedNFTs);
        } else {
          setNfts(ownedNFTs);
        }
        
        // Update the reference count
        prevNftCountRef.current = currentCount;
      } catch (err: any) {
        console.error('Failed to fetch NFTs:', err);
        // Show error in UI, but don't alert for account not found since it's expected
        setNfts([]);
        
        if (!err.message?.includes('Account not found')) {
          // Only show alert for unexpected errors
          const message = err.message || 'Unknown error';
          if (!message.includes('actNotFound')) {
            alert(`XRPL Error: ${message}`);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTs();
    // Set up polling for new NFTs
    const interval = setInterval(fetchNFTs, 10000);
    return () => clearInterval(interval);
  }, [wallet, lastMintedTokenId]);
  
  const handleMintEgg = async () => {
    try {
      setLoading(true);
      setMintingStatus('Preparing to mint NFT...');
      
      // In a real app, this would happen on the backend after payment verification
      // For demo, we'll mint directly from the frontend
      const eggUri = "ipfs://QmXExS4BMc1YrH6iWERyryFKXdve5YUFJf1oaYxLxdvGmZ";
      
      // Store the current NFT count to compare after minting
      prevNftCountRef.current = nfts.length;
      
      // Clear any previous mint token ID
      setLastMintedTokenId(null);
      
      // Show status instead of alert for better UX
      setMintingStatus('Submitting NFT minting transaction to XRPL...');
      
      const result = await mintNFT(wallet, eggUri);
      console.log("Mint result:", result);
      
      if (result.verified) {
        setMintingStatus('NFT minted successfully! Refreshing your collection...');
      } else {
        setMintingStatus('Transaction submitted. Waiting for confirmation...');
      }
      
      // If the result includes updated NFTs, use them directly
      if (result.nfts && result.nfts.length > 0) {
        console.log(`Setting ${result.nfts.length} NFTs from mint result`);
        
        // Identify the new NFT (if we can)
        // In a real app with TokenIDs returned from minting, we'd use that
        // For now, we'll assume it's the last one if count increased
        if (result.nfts.length > prevNftCountRef.current) {
          // Sort by serial number (descending) to find the newest one
          const sortedNFTs = [...result.nfts].sort((a, b) => 
            (b.SerialNumber || 0) - (a.SerialNumber || 0)
          );
          
          // Assume the first one is the newest
          if (sortedNFTs.length > 0) {
            const newTokenId = sortedNFTs[0].NFTokenID;
            setLastMintedTokenId(newTokenId);
            console.log('New NFT identified:', newTokenId);
          }
          
          // Mark the new NFTs
          const enhancedNFTs = result.nfts.map(nft => ({
            ...nft,
            isNew: lastMintedTokenId ? nft.NFTokenID === lastMintedTokenId : 
                  nft.NFTokenID === sortedNFTs[0]?.NFTokenID
          }));
          
          setNfts(enhancedNFTs);
        } else {
          // Just use the NFTs as-is
          setNfts(result.nfts);
        }
      } else {
        // Otherwise, fetch NFTs separately with a retry mechanism
        console.log("Fetching NFTs after mint...");
        // Try fetching a few times to allow for ledger finalization
        let retries = 3;
        let ownedNFTs: NFT[] = [];
        
        while (retries > 0) {
          try {
            ownedNFTs = await getOwnedNFTs(wallet.address);
            if (ownedNFTs.length > prevNftCountRef.current) {
              // Success! We found the new NFTs
              break;
            } else {
              setMintingStatus(`Waiting for NFT to appear (attempt ${4-retries}/3)...`);
              // Wait 2 seconds between retries
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (err) {
            console.warn('Error fetching NFTs, retrying:', err);
          }
          retries--;
        }
        
        if (ownedNFTs.length > prevNftCountRef.current) {
          // We have more NFTs than before, mark the new ones
          const enhancedNFTs = ownedNFTs.map(nft => ({
            ...nft,
            // Mark all new NFTs since we can't easily identify just one
            isNew: true
          }));
          setNfts(enhancedNFTs);
        } else {
          // Just use whatever we got
          setNfts(ownedNFTs);
        }
      }
      
      // Show final success message
      setMintingStatus('');
      alert(`NFT minting result: ${result.result?.engine_result || 'Success'}\n` + 
            `You now have ${result.nft_count || result.nfts?.length || '?'} NFTs\n` +
            `Transaction hash: ${result.tx_hash?.substring(0, 10) || 'unknown'}...`);
    } catch (err: any) {
      console.error('Failed to mint NFT:', err);
      setMintingStatus('');
      alert(`XRPL Error: ${err.message || 'Failed to mint NFT'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleHatch = async (nftId: string) => {
    try {
      setHatching(true);
      setSelectedNFT(nftId);
      
      // Generate random DNA
      const dna = Array.from({ length: 32 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      // Use DNA to derive stats
      const generateStatFromDna = (segment: string) => {
        let sum = 0;
        for (let i = 0; i < segment.length; i++) {
          sum += parseInt(segment[i], 16);
        }
        return Math.max(1, Math.min(100, Math.floor(sum * 100 / (15 * segment.length))));
      };
      
      // Create pet from DNA
      setPet({
        id: nftId,
        dna: dna,
        stats: {
          strength: generateStatFromDna(dna.substring(0, 8)),
          speed: generateStatFromDna(dna.substring(8, 16)),
          intelligence: generateStatFromDna(dna.substring(16, 24)),
          endurance: generateStatFromDna(dna.substring(24, 32)),
        },
      });
      
      // In a real app, we would call the oracle service to sign the DNA on-chain
      // await fetch('http://localhost:8081/hatch', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ address: wallet.address, nft_id: nftId }),
      // });
      
    } catch (err) {
      console.error('Failed to hatch egg:', err);
      alert("Failed to hatch egg. Please try again.");
    } finally {
      setHatching(false);
    }
  };
  
  if (loading) {
    return <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Your Eggs</h1>
      <p>Loading your NFTs...</p>
    </div>;
  }
  
  if (pet) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1>Your Pet</h1>
        
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, #${pet.dna.substring(0, 6)}, #${pet.dna.substring(6, 12)})`,
              marginRight: '20px'
            }}></div>
            
            <div>
              <h2>Creature #{pet.id.substring(0, 8)}...</h2>
              <p>DNA: {pet.dna.substring(0, 10)}...</p>
            </div>
          </div>
          
          <h3>Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p>Strength: {pet.stats.strength}</p>
              <div style={{ height: '10px', background: '#eee', borderRadius: '5px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${pet.stats.strength}%`, 
                  background: '#ff6b6b', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>
            
            <div>
              <p>Speed: {pet.stats.speed}</p>
              <div style={{ height: '10px', background: '#eee', borderRadius: '5px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${pet.stats.speed}%`, 
                  background: '#4ecdc4', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>
            
            <div>
              <p>Intelligence: {pet.stats.intelligence}</p>
              <div style={{ height: '10px', background: '#eee', borderRadius: '5px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${pet.stats.intelligence}%`, 
                  background: '#a3a1ff', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>
            
            <div>
              <p>Endurance: {pet.stats.endurance}</p>
              <div style={{ height: '10px', background: '#eee', borderRadius: '5px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${pet.stats.endurance}%`, 
                  background: '#ffd166', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setPet(null)}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Back to Eggs
        </button>
      </div>
    );
  }
  
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Your Eggs</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleMintEgg}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            marginBottom: '15px',
            position: 'relative',
            backgroundColor: loading ? '#f0f0f0' : '#4a90e2',
            color: loading ? '#888' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Minting...' : 'Mint Test Egg NFT'}
        </button>
        
        {mintingStatus && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderLeft: '4px solid #4a90e2',
            borderRadius: '4px'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              <span style={{ display: 'inline-block', marginRight: '8px' }}>⏳</span>
              {mintingStatus}
            </p>
          </div>
        )}
        
        <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
          This button directly mints an egg NFT for testing. In the real game, NFTs are minted after payment.
        </p>
      </div>
      
      {nfts.length === 0 ? (
        <div>
          <p>You don't have any eggs yet. Buy one from the shop or mint a test egg.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {nfts.map((nft) => (
            <div key={nft.NFTokenID} style={{ 
              border: nft.isNew ? '2px solid #4caf50' : '1px solid #ccc', 
              borderRadius: '8px', 
              padding: '15px', 
              textAlign: 'center',
              width: '150px',
              position: 'relative',
              boxShadow: nft.isNew ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none',
              animation: nft.isNew ? 'pulse 2s infinite' : 'none'
            }}>
              {nft.isNew && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  New
                </div>
              )}
              
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: nft.isNew 
                  ? 'linear-gradient(45deg, #a8e063, #56ab2f)' 
                  : 'linear-gradient(45deg, #f9c5d1, #9795ef)',
                margin: '0 auto 15px',
                transition: 'all 0.3s ease'
              }}></div>
              
              <p style={{ 
                fontWeight: nft.isNew ? 'bold' : 'normal',
                color: nft.isNew ? '#2e7d32' : 'inherit' 
              }}>
                NFT ID: {nft.NFTokenID.substring(0, 8)}...
              </p>
              
              <button 
                onClick={() => handleHatch(nft.NFTokenID)} 
                disabled={hatching && selectedNFT === nft.NFTokenID}
                style={{
                  backgroundColor: nft.isNew ? '#4caf50' : '#4a90e2',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: (hatching && selectedNFT === nft.NFTokenID) ? 'not-allowed' : 'pointer',
                  opacity: (hatching && selectedNFT === nft.NFTokenID) ? 0.7 : 1
                }}
              >
                {hatching && selectedNFT === nft.NFTokenID ? 'Hatching...' : 'Hatch Egg'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
        <h3>XRPL Integration</h3>
        <p>These are actual NFTs stored on the XRPL ledger.</p>
        <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
          When minting NFTs directly, we use the connected wallet's funds to pay the transaction fee.
          In a production environment, this would happen on the backend after purchase verification.
        </p>
      </div>
      
      {/* Add some styling for the pulse animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
      `}} />
    </div>
  );
}