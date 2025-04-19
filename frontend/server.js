// Enhanced proxy server for XRPL signing requests with better error handling
const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 3001;

// Create a function to execute docker commands
function executeDockerCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing docker command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject({ error, stderr });
        return;
      }
      
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
      
      try {
        // Parse the JSON response from rippled command
        // The output has some log lines before the JSON, so we need to extract the JSON part
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = stdout.substring(jsonStart, jsonEnd);
          const rippledResponse = JSON.parse(jsonStr);
          resolve(rippledResponse);
        } else {
          reject(new Error('Could not parse rippled response'));
        }
      } catch (parseError) {
        console.error('Error parsing rippled response:', parseError);
        reject(parseError);
      }
    });
  });
}

// Handle NFT minting transactions
async function handleNFTMint(txJson, secret, res) {
  try {
    // Format the transaction as a JSON string for the rippled command
    const txJsonString = JSON.stringify(txJson).replace(/"/g, '\\"');
    
    console.log('Executing rippled submit command for NFT minting...');
    
    // Execute the docker command
    const dockerCommand = `docker exec xrpl-node rippled submit '${secret}' '${txJsonString}'`;
    const rippledResponse = await executeDockerCommand(dockerCommand);
    
    // Format the response
    const formattedResponse = {
      result: rippledResponse.result || rippledResponse
    };
    
    // Send successful response
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(formattedResponse));
    
  } catch (error) {
    console.error('Error in NFT minting:', error);
    
    // Send error response
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: "nft_mint_error", 
      error_message: error.message || 'Unknown error',
      details: error.stderr || 'No additional details'
    }));
  }
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  // Handle proxy requests
  if (req.method === 'POST' && req.url === '/api/xrpl-proxy') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      console.log('Received XRPL proxy request');
      
      try {
        const requestData = JSON.parse(body);
        
        // Validate the request
        if (!requestData.method || !requestData.params || !requestData.params[0]) {
          throw new Error('Invalid request format');
        }
        
        // Handle different transaction types
        if (requestData.method === 'submit') {
          const txJson = requestData.params[0].tx_json;
          const secret = requestData.params[0].secret;
          
          if (!txJson || !secret) {
            throw new Error('Missing tx_json or secret in request');
          }
          
          // Handle NFT minting
          if (txJson.TransactionType === 'NFTokenMint') {
            await handleNFTMint(txJson, secret, res);
          } else {
            // Handle other transaction types
            console.log(`Handling transaction type: ${txJson.TransactionType}`);
            
            // Format the transaction as a JSON string for the rippled command
            const txJsonString = JSON.stringify(txJson).replace(/"/g, '\\"');
            
            try {
              const rippledResponse = await executeDockerCommand(
                `docker exec xrpl-node rippled submit '${secret}' '${txJsonString}'`
              );
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                result: rippledResponse.result || rippledResponse
              }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: "transaction_error", 
                error_message: error.message || 'Unknown error',
                details: error.stderr || 'No additional details'
              }));
            }
          }
        } else {
          // Handle other methods
          console.log('Unsupported method:', requestData.method);
          res.statusCode = 400;
          res.end(JSON.stringify({ 
            error: 'unsupported_method', 
            error_message: `Method ${requestData.method} is not supported` 
          }));
        }
      } catch (error) {
        console.error('Error processing request:', error.message);
        res.statusCode = 400;
        res.end(JSON.stringify({ 
          error: 'request_error', 
          error_message: error.message
        }));
      }
    });
  } else {
    // Handle 404 for all other routes
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not_found', error_message: 'Endpoint not found' }));
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`✅ Proxy server running at http://localhost:${PORT}`);
  console.log(`Ready to handle XRPL transaction signing requests`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down proxy server');
  server.close();
  process.exit(0);
});