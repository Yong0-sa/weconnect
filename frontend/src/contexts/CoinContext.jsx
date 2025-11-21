import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { fetchCoinBalance, earnCoins } from "../api/coins";
import { purchaseShopItem } from "../api/shop";

const hasAuthToken = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(localStorage.getItem("authToken"));
};

const CoinContext = createContext();

const PUBLIC_ROUTE_PREFIXES = ["/", "/login", "/signup", "/oauth/success", "/tutorial", "/first-tutorial"];

export function CoinProvider({ children }) {
  const location = useLocation();
  // 로컬스토리지에서 초기값 불러오기 (백엔드 준비 전 임시 방안)
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem("userCoins");
    return saved ? parseInt(saved, 10) : 0;
  });

  const skipAutoRefresh = useMemo(() => {
    const path = location?.pathname || "/";
    return PUBLIC_ROUTE_PREFIXES.some((prefix) =>
      prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`)
    );
  }, [location?.pathname]);

  const syncCoins = useCallback((value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    setCoins(safeValue);
    localStorage.setItem("userCoins", safeValue.toString());
  }, []);

  const refreshCoins = useCallback(async () => {
    if (!hasAuthToken()) {
      syncCoins(0);
      return;
    }
    try {
      const data = await fetchCoinBalance();
      if (typeof data?.coinBalance === "number") {
        syncCoins(data.coinBalance);
      }
    } catch (err) {
      if (err?.message === "로그인이 필요합니다.") {
        syncCoins(0);
        return;
      }
      console.error("코인 잔액 불러오기 실패:", err);
    }
  }, [syncCoins]);

  // 백엔드에서 실제 코인 개수 불러오기 (로그인 후 진입한 화면에서만)
  useEffect(() => {
    if (skipAutoRefresh) {
      return;
    }
    refreshCoins();
  }, [refreshCoins, skipAutoRefresh]);

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
