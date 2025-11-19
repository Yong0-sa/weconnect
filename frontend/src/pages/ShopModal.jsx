import { useCallback, useEffect, useState } from "react";
import "./ShopModal.css";
import CoinIcon from "../assets/item_icon.png";
import BaseCharacterImage from "../assets/캐릭터.png";
import { useCoins } from "../contexts/CoinContext";
import {
  fetchShopItems,
  fetchUserItems,
  equipShopItem,
} from "../api/shop";

const SHOP_EQUIPMENT_EVENT = "shopEquipmentChange";
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

const cloneItems = (items) => items.map((item) => ({ ...item }));
let sessionItemsState = null;
let sessionEquippedItemId = null;

const resolveAssetUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

function ShopModal({ onClose, userName = "사용자" }) {
  const [items, setItemsState] = useState(() =>
    sessionItemsState ? cloneItems(sessionItemsState) : []
  );
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const { coins, purchaseItem } = useCoins();

  const setItems = useCallback((updater) => {
    setItemsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      sessionItemsState = cloneItems(next);
      return next;
    });
  }, []);

  const setEquippedItemId = useCallback((nextId) => {
    sessionEquippedItemId = nextId ?? null;
    setEquippedItemIdState(nextId);
  }, []);

  const broadcastEquipmentChange = useCallback((nextId) => {
    if (typeof window !== "undefined") {
      window.shopEquippedItemId = nextId ?? null;
      window.dispatchEvent(
        new CustomEvent(SHOP_EQUIPMENT_EVENT, { detail: nextId ?? null })
      );
    }
  }, []);

  const handlePurchase = async (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.owned) return false;
    const result = await purchaseItem(itemId);
    if (!result?.item) return false;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              owned: true,
              quantity: Math.max(1, (i.quantity ?? 0) + 1),
            }
          : i
      )
    );
    return true;
  };

  const handleEquip = async (itemId) => {
    const item = items.find((i) => i.id === itemId && i.owned);
    if (!item) return false;
    try {
      await equipShopItem(itemId);
    } catch (error) {
      console.error("아이템 장착 실패:", error);
      return false;
    }
    setEquippedItemId(itemId);
    broadcastEquipmentChange(itemId);
    return true;
  };

  useEffect(() => {
    let ignore = false;
    async function loadItems() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [catalog, inventory] = await Promise.all([
          fetchShopItems(),
          fetchUserItems(),
        ]);
        if (ignore) return;
        const inventoryItems = Array.isArray(inventory?.items)
          ? inventory.items
          : [];
        const ownedMap = new Map(
          inventoryItems.map((entry) => [entry.itemId, entry])
        );
        const normalized = (catalog ?? []).map((item) => {
          const saved =
            sessionItemsState?.find((savedItem) => savedItem.id === item.id) ||
            null;
          const ownedEntry = ownedMap.get(item.id) || null;
          const owned = ownedEntry ? true : saved?.owned ?? false;
          const quantity = owned
            ? Math.max(saved?.quantity ?? 0, 1)
            : saved?.quantity ?? 0;
          return {
            id: item.id,
            name: item.name,
            coinPrice: item.price ?? 0,
            info: item.info ?? "",
            image: resolveAssetUrl(item.photoUrl),
            equippedImage: resolveAssetUrl(item.equippedPhotoUrl),
            animationUrl: resolveAssetUrl(item.animationUrl),
            owned,
            quantity,
          };
        });
        setItems(normalized);
        const equipped =
          inventoryItems.find(
            (entry) =>
              entry.status === "EQUIPPED" &&
              (entry.category ?? "tool").toLowerCase() === "tool"
          ) || null;
        const equippedId = equipped?.itemId ?? null;
        setEquippedItemId(equippedId);
        broadcastEquipmentChange(equippedId);
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error?.message || "상점 정보를 불러오는 중 문제가 발생했습니다."
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadItems();
    return () => {
      ignore = true;
    };
  }, [broadcastEquipmentChange]);

  const handleItemButtonClick = async (item) => {
    if (!item.owned) {
      await handlePurchase(item.id);
      return;
    }

    if (item.id !== equippedItemId) {
      await handleEquip(item.id);
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
  const previewImage = equippedItem ? equippedItem.equippedImage : null;

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
          {isLoading ? (
            <div className="shop-item-placeholder">아이템을 불러오는 중...</div>
          ) : loadError ? (
            <div className="shop-item-placeholder error">{loadError}</div>
          ) : items.length === 0 ? (
            <div className="shop-item-placeholder">
              표시할 아이템이 없습니다.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="shop-item-card">
                <div className="shop-item-header">
                  <h3 className="shop-item-name">{item.name}</h3>
                  <div className="shop-item-price">
                    <img src={CoinIcon} alt="코인" className="coin-icon" />
                    <span className="price-text">X {item.coinPrice}</span>
                  </div>
                </div>

                {item.image &&
                  (/\.webm(\?.*)?$/i.test(item.image) ? (
                    <video
                      src={item.image}
                      className="shop-item-inline-image"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="shop-item-inline-image"
                    />
                  ))}

                <button
                  type="button"
                  className={`shop-item-button ${getButtonClass(item)}`}
                  onClick={() => handleItemButtonClick(item)}
                  disabled={!item.owned && coins < item.coinPrice}
                >
                  {getButtonLabel(item)}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopModal;
