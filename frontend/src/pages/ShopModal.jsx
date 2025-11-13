import { useState } from "react";
import "./ShopModal.css";
import CoinIcon from "../assets/item_icon.png";
import { useCoins } from "../contexts/CoinContext";

const shopItems = [
  {
    id: 1,
    name: "모종삽",
    coinPrice: 3,
    owned: true,
    quantity: 1,
  },
  {
    id: 2,
    name: "쟁이",
    coinPrice: 7,
    owned: false,
    quantity: 0,
  },
  {
    id: 3,
    name: "트랙터",
    coinPrice: 30,
    owned: false,
    quantity: 0,
  },
];

function ShopModal({ onClose }) {
  const [items, setItems] = useState(shopItems);
  const { coins, purchaseItem } = useCoins();

  const handlePurchase = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (item && purchaseItem(item.coinPrice)) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, owned: true, quantity: i.quantity + 1 }
            : i
        )
      );
      console.log(`${item.name} 구매 완료!`);
    } else {
      console.log("코인이 부족합니다.");
    }
  };

  const handleEquip = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      console.log(`${item.name} 장착!`);
    }
  };

  return (
    <div className="shop-modal-card">
      {onClose && (
        <button
          type="button"
          className="shop-modal-close"
          onClick={onClose}
          aria-label="상점 닫기"
        >
          ×
        </button>
      )}

      <header className="shop-modal-header">
        <h2>아이템 상점</h2>
      </header>

      <div className="shop-items-grid">
        {items.map((item) => (
          <div key={item.id} className="shop-item-card">
            <div className="shop-item-header">
              <h3 className="shop-item-name">{item.name}</h3>
              <div className="shop-item-price">
                <img src={CoinIcon} alt="코인" className="coin-icon" />
                <span className="price-text">X {item.coinPrice}</span>
              </div>
            </div>

            <div className="shop-item-image-area">
              {/* 이미지 영역 - 추후 이미지 삽입 */}
            </div>

            <button
              type="button"
              className={`shop-item-button ${
                item.owned ? "equipped" : "purchase"
              }`}
              onClick={() =>
                item.owned ? handleEquip(item.id) : handlePurchase(item.id)
              }
            >
              {item.owned ? "장착" : "구매"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShopModal;
