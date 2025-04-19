import React, { useEffect, useState } from 'react';

/**
 * Component to verify XRPL connection status
 */
export default function XrplConnectionTest() {
  const [status, setStatus] = useState('Testing connection...');
  const [serverInfo, setServerInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testXrplConnection() {
      try {
        // Use proxy to avoid CORS issues
        setStatus('Testing XRPL connection via proxy...');
        
        const proxyResponse = await fetch('/api/xrpl-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'server_info',
            params: [{}]
          })
        });
        
        if (!proxyResponse.ok) {
          throw new Error(`Proxy error: HTTP ${proxyResponse.status}`);
        }
        
        const proxyData = await proxyResponse.json();
        console.log('XRPL connection response:', proxyData);
        
        if (proxyData.error) {
          throw new Error(`XRPL error: ${proxyData.error}`);
        }
        
        if (proxyData.result && proxyData.result.info) {
          setStatus('Connection successful');
          setServerInfo(proxyData.result.info);
        } else {
          throw new Error('Invalid response structure from XRPL node');
        }
      } catch (error) {
        console.error('Connection test error:', error);
        setStatus('Connection failed');
        setError(error);
      }
    }
    
    testXrplConnection();
  }, []);
  
  return (
    <div style={{ 
      margin: '20px', 
      padding: '20px', 
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f8f8f8',
      maxWidth: '800px'
    }}>
      <h2>XRPL Connection Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status: </strong>
        <span style={{ 
          color: status.includes('successful') ? 'green' : status.includes('Testing') ? 'blue' : 'red',
          fontWeight: 'bold'
        }}>
          {status}
        </span>
      </div>
      
      {error && (
        <div style={{ 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#ffeeee',
          border: '1px solid #ffcccc',
          borderRadius: '4px'
        }}>
          <strong>Error: </strong>
          {error.message || 'Unknown error'}
        </div>
      )}
      
      {serverInfo && (
        <div>
          <h3>Server Information</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Server State</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.server_state}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Version</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.build_version}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Complete Ledgers</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.complete_ledgers}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Uptime</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.uptime} seconds</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Peer Count</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.peers}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Load Factor</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.load_factor}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Server Time</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{serverInfo.time}</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ marginTop: '20px' }}>
            <h3>Connection Details</h3>
            <pre style={{ 
              backgroundColor: '#f0f0f0', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px',
              fontSize: '12px'
            }}>
              {JSON.stringify(serverInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}