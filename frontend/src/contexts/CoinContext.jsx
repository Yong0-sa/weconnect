import { createContext, useContext, useState } from "react";

const CoinContext = createContext();

export function CoinProvider({ children }) {
  const [coins, setCoins] = useState(30);

  const purchaseItem = (price) => {
    if (coins >= price) {
      setCoins((prev) => prev - price);
      return true;
    }
    return false;
  };

  const value = {
    coins,
    purchaseItem,
  };

  return <CoinContext.Provider value={value}>{children}</CoinContext.Provider>;
}

export function useCoins() {
  const context = useContext(CoinContext);
  if (!context) {
    throw new Error("useCoins must be used within CoinProvider");
  }
  return context;
}
