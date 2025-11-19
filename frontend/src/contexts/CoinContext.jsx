import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchCoinBalance, earnCoins } from "../api/coins";
import { purchaseShopItem } from "../api/shop";

const CoinContext = createContext();

export function CoinProvider({ children }) {
  // 로컬스토리지에서 초기값 불러오기 (백엔드 준비 전 임시 방안)
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem("userCoins");
    return saved ? parseInt(saved, 10) : 0;
  });

  const syncCoins = useCallback((value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    setCoins(safeValue);
    localStorage.setItem("userCoins", safeValue.toString());
  }, []);

  const refreshCoins = useCallback(async () => {
    try {
      const data = await fetchCoinBalance();
      if (typeof data?.coinBalance === "number") {
        syncCoins(data.coinBalance);
      }
    } catch (err) {
      console.error("코인 잔액 불러오기 실패:", err);
    }
  }, [syncCoins]);

  // 백엔드에서 실제 코인 개수 불러오기
  useEffect(() => {
    refreshCoins();
  }, [refreshCoins]);

  const purchaseItem = useCallback(async (itemId) => {
    if (!itemId) {
      return null;
    }
    try {
      const data = await purchaseShopItem(itemId);
      syncCoins(data?.coinBalance ?? 0);
      return data;
    } catch (err) {
      console.error("아이템 구매 실패:", err);
      return null;
    }
  }, [syncCoins]);

  // 코인 적립 함수 (일기 작성 등)
  const addCoins = useCallback(
    async (amount, reason) => {
      if (!amount || amount <= 0) {
        return false;
      }
      try {
        const data = await earnCoins(amount, reason);
        syncCoins(data?.coinBalance ?? 0);
        return true;
      } catch (err) {
        console.error("코인 적립 실패:", err);
        return false;
      }
    },
    [syncCoins]
  );

  const value = {
    coins,
    purchaseItem,
    addCoins,
    refreshCoins,
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
