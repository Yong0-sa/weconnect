import { useState } from "react";
import "./ShopModal.css";
import CoinIcon from "../assets/item_icon.png";
import BaseCharacterImage from "../assets/캐릭터.png";
import SeederImage from "../assets/모종삽.png";
import PickaxeImage from "../assets/곡괭이.png";
import TractorImage from "../assets/트랙터.png";
import SeederEquippedImage from "../assets/호미 장착 캐릭터.png";
import PickaxeEquippedImage from "../assets/곡괭이 장착.png";
import TractorEquippedImage from "../assets/트랙터 장착.png";
import { useCoins } from "../contexts/CoinContext";

const SHOP_EQUIPMENT_EVENT = "shopEquipmentChange";

const initialItems = [
  {
    id: 1,
    name: "모종삽",
    coinPrice: 3,
    owned: false,
    quantity: 0,
    image: SeederImage,
  },
  {
    id: 2,
    name: "곡괭이",
    coinPrice: 7,
    owned: false,
    quantity: 0,
    image: PickaxeImage,
  },
  {
    id: 3,
    name: "트랙터",
    coinPrice: 30,
    owned: false,
    quantity: 0,
    image: TractorImage,
  },
];

const equippedPreviewImages = {
  1: SeederEquippedImage,
  2: PickaxeEquippedImage,
  3: TractorEquippedImage,
};

const cloneItems = (items) => items.map((item) => ({ ...item }));
let sessionItemsState = null;
let sessionEquippedItemId = null;

function ShopModal({ onClose, userName = "사용자" }) {
  const [items, setItemsState] = useState(() => {
    if (sessionItemsState) {
      return cloneItems(sessionItemsState);
    }
    return cloneItems(initialItems);
  });
  const [equippedItemId, setEquippedItemIdState] = useState(() => {
    if (sessionEquippedItemId != null) {
      return sessionEquippedItemId;
    }
    if (typeof window !== "undefined" && window.shopEquippedItemId != null) {
      const parsed = Number(window.shopEquippedItemId);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  });
  const { coins, purchaseItem } = useCoins();

  const setItems = (updater) => {
    setItemsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      sessionItemsState = cloneItems(next);
      return next;
    });
  };

  const setEquippedItemId = (nextId) => {
    sessionEquippedItemId = nextId ?? null;
    setEquippedItemIdState(nextId);
  };

  const broadcastEquipmentChange = (nextId) => {
    if (typeof window !== "undefined") {
      window.shopEquippedItemId = nextId ?? null;
      window.dispatchEvent(
        new CustomEvent(SHOP_EQUIPMENT_EVENT, { detail: nextId ?? null })
      );
    }
  };

  const handlePurchase = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.owned) return false;
    if (!purchaseItem(item.coinPrice)) return false;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, owned: true, quantity: i.quantity + 1 }
          : i
      )
    );
    return true;
  };

  const handleEquip = (itemId) => {
    const item = items.find((i) => i.id === itemId && i.owned);
    if (!item) return;
    setEquippedItemId(itemId);
    broadcastEquipmentChange(itemId);
  };

  const handleItemButtonClick = (item) => {
    if (!item.owned) {
      handlePurchase(item.id);
      return;
    }

    if (item.id !== equippedItemId) {
      handleEquip(item.id);
    }
  };

  const getButtonLabel = (item) => {
    if (!item.owned) return "구매";
    if (item.id === equippedItemId) return "장착중";
    return "장착";
  };

  const getButtonClass = (item) => {
    if (!item.owned) return "purchase";
    return item.id === equippedItemId ? "equipped" : "owned";
  };

  const equippedItem = items.find((i) => i.id === equippedItemId);
  const previewImage = equippedItem
    ? equippedPreviewImages[equippedItem.id]
    : null;

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

      <div className="shop-modal-body">
        <aside className="shop-preview-panel">
          <div className="shop-preview-avatar">
            {previewImage ? (
              <img
                src={previewImage}
                alt={`${equippedItem.name} 장착 모습`}
                className="shop-preview-equipped-image"
              />
            ) : (
              <img
                src={BaseCharacterImage}
                alt="기본 캐릭터"
                className="shop-preview-base-image"
              />
            )}
          </div>
          <div className="shop-preview-status">
            <span className="shop-preview-user">{userName}</span>
          </div>
        </aside>

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

              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="shop-item-inline-image"
                />
              )}

              <button
                type="button"
                className={`shop-item-button ${getButtonClass(item)}`}
                onClick={() => handleItemButtonClick(item)}
                disabled={!item.owned && coins < item.coinPrice}
              >
                {getButtonLabel(item)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShopModal;
