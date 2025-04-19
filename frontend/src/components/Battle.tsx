import React, { useState } from 'react';
import type { Wallet } from '../xrpl-direct';
import { claimReward } from '../xrpl-direct';

interface BattleProps {
  wallet: Wallet;
}

interface BattleResult {
  victory: boolean;
  spark: number;
}

export default function Battle({ wallet }: BattleProps) {
  const [battling, setBattling] = useState<boolean>(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);
  
  const handleBattle = async () => {
    try {
      setBattling(true);
      setResult(null);
      
      // Simulate battle result
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 50/50 chance of winning
      const victory = Math.random() > 0.5;
      const reward = victory ? Math.floor(Math.random() * 20) + 5 : 0;
      
      setResult({ victory, spark: reward });
      
    } catch (err) {
      console.error('Battle failed:', err);
    } finally {
      setBattling(false);
    }
  };
  
  const handleClaimReward = async () => {
    if (!result) return;
    
    try {
      setClaiming(true);
      
      // Call the XRPL reward claim function
      await claimReward(wallet, String(result.spark));
      
      alert(`Successfully claimed ${result.spark} SPARK tokens!`);
      setResult(null);
      
    } catch (err: any) {
      console.error('Failed to claim reward:', err);
      alert(`XRPL Error: ${err.message || 'Failed to claim reward'}`);
    } finally {
      setClaiming(false);
    }
  };
  
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Battle Arena</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleBattle} 
          disabled={battling}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          {battling ? 'Finding Match...' : 'Find Battle'}
        </button>
      </div>
      
      {result && (
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '8px', 
          padding: '20px', 
          marginTop: '20px' 
        }}>
          <h2>Battle Result</h2>
          
          <div style={{ 
            padding: '15px', 
            background: result.victory ? '#d4edda' : '#f8d7da',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px' }}>{
              result.victory 
                ? '🎉 Victory!' 
                : '😢 Defeat!'
            }</h3>
            
            {result.victory && (
              <p>You've earned {result.spark} SPARK tokens!</p>
            )}
          </div>
          
          {result.victory && (
            <button 
              onClick={handleClaimReward}
              disabled={claiming}
              style={{ 
                padding: '10px 20px', 
                background: '#ffc107', 
                border: 'none', 
                borderRadius: '5px',
                cursor: claiming ? 'not-allowed' : 'pointer' 
              }}
            >
              {claiming ? 'Claiming...' : `Claim ${result.spark} SPARK`}
            </button>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
        <h3>XRPL Integration</h3>
        <p>All battle rewards are tracked using the XRPL ledger.</p>
        <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
          Note: Reward claiming is a simulated functionality and will show an error message.
          In a production environment, this would be implemented using an XRPL Hook or similar mechanism.
        </p>
      </div>
    </div>
  );
}