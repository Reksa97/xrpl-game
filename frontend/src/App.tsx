import React, { useState } from "react";
import type { Wallet } from "./xrpl-direct";
import EggShop from "./components/EggShop";
import Pet from "./components/Pet";
import Battle from "./components/Battle";
import ConnectionStatus from "./components/ConnectionStatus";
// @ts-ignore - JSX file without type definitions
import XrplConnectionTest from "./xrpl-connection-test.jsx";

export default function App() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [showConnectionTest, setShowConnectionTest] = useState(true);
  
  return (
    <>
      {showConnectionTest && (
        <>
          <XrplConnectionTest />
          <div style={{ textAlign: 'center', margin: '20px' }}>
            <button 
              onClick={() => setShowConnectionTest(false)}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Continue to Application
            </button>
          </div>
        </>
      )}
      
      {!showConnectionTest && (
        <>
          {!wallet ? (
            <EggShop onWallet={setWallet} />
          ) : (
            <>
              <Pet wallet={wallet} />
              <Battle wallet={wallet} />
            </>
          )}
          <ConnectionStatus />
        </>
      )}
    </>
  );
}