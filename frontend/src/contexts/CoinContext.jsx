import { createContext, useContext, useState, useEffect } from "react";

const CoinContext = createContext();

export function CoinProvider({ children }) {
  // 로컬스토리지에서 초기값 불러오기 (백엔드 준비 전 임시 방안)
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem("userCoins");
    return saved ? parseInt(saved, 10) : 0;
  });

  // 백엔드에서 실제 코인 개수 불러오기
  useEffect(() => {
    // TODO: 백엔드 API 연동
    // fetch(`${API_BASE_URL}/api/profile/me`, {
    //   method: "GET",
    //   credentials: "include",
    // })
    //   .then(res => res.json())
    //   .then(data => {
    //     if (data?.coins !== undefined) {
    //       setCoins(data.coins);
    //       localStorage.setItem("userCoins", data.coins);
    //     }
    //   })
    //   .catch(err => console.error("코인 불러오기 실패:", err));
  }, []);

  // 코인 변경 시 로컬스토리지 동기화
  useEffect(() => {
    localStorage.setItem("userCoins", coins);
  }, [coins]);

  const purchaseItem = (price) => {
    if (coins >= price) {
      setCoins((prev) => {
        const newAmount = prev - price;
        // TODO: 백엔드 API - 구매 내역 저장
        // fetch(`${API_BASE_URL}/api/coins/purchase`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   credentials: "include",
        //   body: JSON.stringify({ price, newBalance: newAmount })
        // });
        return newAmount;
      });
      return true;
    }
    return false;
  };

  // 코인 적립 함수 (일기 작성 등)
  const addCoins = (amount) => {
    setCoins((prev) => {
      const newAmount = prev + amount;
      // TODO: 백엔드 API - 코인 적립 내역 저장
      // fetch(`${API_BASE_URL}/api/coins/add`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({ amount, newBalance: newAmount })
      // });
      return newAmount;
    });
  };

  const value = {
    coins,
    purchaseItem,
    addCoins,
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
