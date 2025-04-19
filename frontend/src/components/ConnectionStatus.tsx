import React, { useState, useEffect } from 'react';

// Only use the proxy to avoid CORS issues
const PROXY_URL = '/api/xrpl-proxy';
const PING_INTERVAL = 5000; // 5 seconds

// Simple connection status component
const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        setStatus('connecting');
        setError(null);
        
        // Use proxy connection - avoids CORS issues
        console.log(`Checking connection via proxy: ${PROXY_URL}`);
        
        const response = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'server_info',
            params: [{}]
          })
        });
        
        if (!response.ok) {
          throw new Error(`Proxy error: ${response.status}`);
        }
        
        const proxyResponse = await response.json();
        
        if (proxyResponse.error) {
          throw new Error(`XRPL error: ${proxyResponse.error}`);
        }
        
        console.log('Connection successful:', proxyResponse);
        setStatus('connected');
        setLastResponse(proxyResponse);
        setReconnectCount(0);
        
        // Set up periodic pings
        pingInterval = setInterval(async () => {
          try {
            const pingResponse = await fetch(PROXY_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                method: 'server_info',
                params: [{}]
              })
            });
            
            if (pingResponse.ok) {
              const data = await pingResponse.json();
              setLastResponse(data);
            } else {
              throw new Error(`Ping error: ${pingResponse.status}`);
            }
          } catch (error) {
            console.error('Ping failed:', error);
            setStatus('disconnected');
            setError(error instanceof Error ? error.message : String(error));
          }
        }, PING_INTERVAL);
      } catch (error) {
        console.error('Connection failed:', error);
        setStatus('disconnected');
        setError(error instanceof Error ? error.message : String(error));
        
        // Schedule a reconnection attempt
        reconnectTimeout = setTimeout(() => {
          setReconnectCount(prevCount => prevCount + 1);
          checkConnection();
        }, 5000);
      }
    };
    
    // Initial connection check
    checkConnection();
    
    // Cleanup on unmount
    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);
  
  // Render status details
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FFC107';
      case 'disconnected': return '#F44336';
    }
  };
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: getStatusColor(),
          marginRight: '5px'
        }}></div>
        <strong>XRPL Status:</strong> {status}
        {reconnectCount > 0 && ` (Attempts: ${reconnectCount})`}
      </div>
      
      {error && (
        <div style={{ color: '#F44336', marginBottom: '5px' }}>
          {error}
        </div>
      )}
      
      {lastResponse && lastResponse.result && lastResponse.result.info && (
        <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <div>Server: {lastResponse.result.info.server_state}</div>
          <div>Ledgers: {lastResponse.result.info.complete_ledgers}</div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;