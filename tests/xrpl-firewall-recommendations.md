# XRPL Node Firewall Configuration Recommendations

Based on our testing, we've identified some issues with connecting to the XRPL node at 34.88.230.243. Here are recommendations to ensure proper connectivity:

## Firewall Requirements for XRPL Node

1. **HTTP/WebSocket (JSON-RPC API)**
   - Port: 51234 (default) - TCP
   - Purpose: Primary API for client applications

2. **Peer Protocol**
   - Port: 51235 (default) - TCP
   - Purpose: Node-to-node communication

3. **Admin WebSocket API**
   - Port: 5005 (commonly used) - TCP
   - Purpose: Administrative commands

## Connection Issues Identified

1. **Port 51234 (WebSocket API)**: Connection refused
   - This port is needed for WebSocket connections but appears to be blocked
   - Recommendation: Ensure firewall allows TCP traffic on port 51234

2. **Port 80 (HTTP)**: Connection resets after initial connection
   - The server accepts connections but then drops them
   - Recommendation: Check that XRPL node is configured to accept HTTP JSON-RPC on port 80

3. **Port 443 (HTTPS)**: TLS handshake fails
   - The server accepts connections but TLS negotiation fails
   - Recommendation: Ensure proper SSL certificates are installed if using HTTPS

## Firewall Rule Recommendations

Add these rules to your firewall:

```
# Allow inbound traffic to XRPL WebSocket API
allow tcp:51234

# Allow inbound traffic to XRPL Peer Protocol
allow tcp:51235

# If using admin API, also allow:
allow tcp:5005
```

## XRPL Configuration

Ensure your rippled.cfg file has these sections properly configured:

```
[port_ws_public]
port = 51234
ip = 0.0.0.0
protocol = ws

[port_rpc]
port = 80
ip = 0.0.0.0
protocol = http
```

## Testing Connectivity

After making changes, you can test connectivity using:

1. WebSocket: `ws://34.88.230.243:51234`
2. HTTP: `http://34.88.230.243:80`

Use the `server_info` command to verify that the API is working properly.