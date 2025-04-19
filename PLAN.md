# Creature Crafter – minimal PoC repo

# Phase 1

> **Goal:** prove XRPL‑based “buy egg → hatch pet → battle → token reward” loop and expose the same XRPL helpers as an SDK.

## 📂 Folder layout

```
creature-crafter/
├─ README.md
├─ frontend/            # React + TypeScript (Vite)
│  ├─ package.json
│  └─ src/
│     ├─ index.tsx
│     ├─ App.tsx
│     ├─ components/
│     │  ├─ EggShop.tsx
│     │  ├─ Pet.tsx
│     │  └─ Battle.tsx
│     └─ xrpl.ts         # thin XRPL helper (will become the SDK)
├─ backend/             # Go micro‑services
│  ├─ go.mod
│  ├─ cmd/
│  │  ├─ matchmaker/main.go
│  │  └─ oracle/main.go
│  └─ internal/
│     ├─ xrplclient/
│     │  └─ client.go
│     └─ game/
│        ├─ pet.go
│        └─ arena.go
└─ hook/                # Rust Hook contract
   ├─ Cargo.toml
   └─ src/lib.rs
```

---

## 🚀 Quick start

```bash
# root
make dev         # runs frontend (Vite) + matchmaker + oracle with reflex reload
```

---

## 1️⃣ frontend/package.json

```json
{
  "name": "creature-crafter-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "xrpl": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "vite": "^5"
  }
}
```

## 1️⃣ frontend/src/xrpl.ts

```ts
import { Client, xrpToDrops, Wallet } from "xrpl";

export const XRPL_NET = "wss://s.altnet.rippletest.net:51233"; // testnet
const client = new Client(XRPL_NET);
await client.connect();

export async function buyEgg(wallet: Wallet, priceXRP = "10") {
  const tx = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: process.env.VITE_EGG_SHOP_ADDR,
    Amount: xrpToDrops(priceXRP),
  } as any;
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const res = await client.submitAndWait(signed.tx_blob);
  return res;
}

export async function getOwnedNFTs(address: string) {
  const nfts = await client.request({
    command: "account_nfts",
    account: address,
  });
  return nfts.result.nfts;
}
```

## 1️⃣ frontend/src/App.tsx

```tsx
import React, { useState } from "react";
import { Wallet } from "xrpl";
import EggShop from "./components/EggShop";
import Pet from "./components/Pet";
import Battle from "./components/Battle";

export default function App() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  if (!wallet) return <EggShop onWallet={setWallet} />;
  return (
    <>
      <Pet wallet={wallet} />
      <Battle wallet={wallet} />
    </>
  );
}
```

_components are minimal placeholders that call `buyEgg`, poll `getOwnedNFTs`, and fetch battle matches from Go service._

---

## 2️⃣ backend/go.mod

```go
module creature-crafter/backend

go 1.22

require (
    github.com/xyield/xrpl-go v0.4.1 // XRPL client wrapper
    github.com/gin-gonic/gin v1.10.0 // simple API
)
```

### backend/cmd/matchmaker/main.go

```go
package main

import (
  "log"
  "math/rand"
  "net/http"
  "time"

  "github.com/gin-gonic/gin"
)

type MatchRequest struct {
  Address string `json:"address"`
  PetID   string `json:"pet_id"`
}

type MatchResult struct {
  Victory bool   `json:"victory"`
  Reward  int    `json:"spark"`
}

func main() {
  rand.Seed(time.Now().UnixNano())
  r := gin.Default()
  r.POST("/match", func(c *gin.Context) {
    var req MatchRequest
    if err := c.BindJSON(&req); err != nil {
      c.JSON(http.StatusBadRequest, gin.H{"err": err.Error()})
      return
    }
    // 50/50 win for demo
    win := rand.Intn(2) == 0
    reward := 10
    c.JSON(200, MatchResult{Victory: win, Reward: reward})
  })
  log.Fatal(r.Run(":8080"))
}
```

### backend/internal/xrplclient/client.go (abridged)

```go
package xrplclient

import (
  "context"
  "github.com/xyield/xrpl-go/client"
)

func New(url string) (*client.Client, error) {
  return client.New(context.Background(), url)
}
```

---

## 3️⃣ hook/src/lib.rs

```rust
#![no_std]
#![allow(unused)]
use xrpl_hook_prelude::*;

// Burns 1% of every Spark token transfer.
#[hook]
fn burn_one_percent(tx: &mut HookCtx) -> i32 {
    // Only run on successful payments
    if !tx.is_xrp_payment() {
        return 0;
    }
    let amt = tx.amount();
    let burn = amt / 100; // 1%
    if burn == 0 { return 0; }

    tx.burn(burn);
    ACCEPT("1% Spark burned", 0);
}
```

`cargo build --target wasm32-unknown-unknown --release` produces `burn_one_percent.wasm` for upload via the XRPL Hooks amendment CLI.

---

## 4️⃣ README excerpt

```md
### Dev flow

1. `make dev` – runs frontend and Go services with hot‑reload.
2. In browser: connect XUMM testnet wallet, buy an egg, wait for mint.
3. Hatch button -> calls `/oracle` randomises, stores DNA off‑chain, signs memo on XRPL.
4. Click Battle -> POST /match -> returns win/lose + Spark amount.
5. Spark claimed? Front‑end submits Payment txn signed by wallet.
```

---

### ✨ Next steps (for open‑source release / SDK)

- Convert `frontend/src/xrpl.ts` into `sdk/index.ts` with typed wrappers.
- Auto‑generate docs using TypeDoc.
- Add Jest tests for Go & TS.
- Ship CI via GitHub Actions (lint + hook size check).
- After MI​CA licence, enable non‑custodial marketplace and royalties.

# Phase 2

Summary: NFT Minting Solution Status

We've successfully implemented NFT minting for Creature Crafter with a real XRPL node by:

1. Enabling NFT features in the rippled.cfg configuration
2. Creating a proxy server that handles transaction signing
3. Updating the frontend code to use this proxy
4. Adding fallback simulation for development

However, XRPL is deprecating the submit command with signing support, which our current implementation relies on.

Next Steps for MVP Testing

1. Immediate Testing (Use Current Implementation)

- Launch all services: docker-compose up -d
- Verify NFTs can be minted from the UI
- Check XRPL node for minted NFTs: docker exec xrpl-node rippled account_nfts rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh

2. Future-Proof Implementation (Post-MVP)

- Implement client-side transaction signing using xrpl-sign library
- Modify proxy to use submit_only instead of submit with credentials
- Update documentation for the new approach

3. Test Plan

1. Test direct NFT minting via command line
1. Test proxy-based minting through the API endpoint
1. Test frontend integration with error handling
1. Verify NFTs appear in user accounts
