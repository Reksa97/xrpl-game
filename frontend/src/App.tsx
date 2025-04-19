import React, { useState } from "react";
import type { Wallet } from "./xrpl-direct";
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