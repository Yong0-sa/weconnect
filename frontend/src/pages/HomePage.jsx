import { useCallback, useEffect, useRef, useState } from "react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";
import { useCoins } from "../contexts/CoinContext";
import BackgroundImg from "../assets/backgroud 1.png";
import AIIcon from "../assets/AI.png";
import FarmSearchIcon from "../assets/농장찾기.png";
import DiaryIcon from "../assets/재배일기.png";
import CommunityIcon from "../assets/커뮤니티.png";
import CharacterIcon from "../assets/캐릭터.png";
import MenuIcon from "../assets/menu_icon.png";
import CoinIcon from "../assets/coin_icon.png";
import ChatIcon from "../assets/chat_icon.png";
import MypageIcon from "../assets/mypage_icon.png";
import TutorialIcon from "../assets/tutorial_icon.png";
import AICropSearchPage from "./AICropSearchPage";
import AIInfoSearchPage from "./AIInfoSearchPage";
import FarmSearchModal from "./FarmSearchModal";
import DiaryModal from "./DiaryModal";
import ProfilePage from "./ProfilePage";
import CommunityModal from "./CommunityModal";
import ChatModal from "./ChatModal";
import ShopModal from "./ShopModal";
import MemberInfoManageModal from "./MemberInfoManageModal";
import { logout as requestLogout } from "../api/auth";
import { acknowledgeFarmPrompt, fetchMyProfile } from "../api/profile";
import { fetchChatRooms } from "../api/chat";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import FarmRegisterModal from "./FarmRegisterModal";
import FarmApplyPromptModal from "./FarmApplyPromptModal";
import { fetchShopItems, fetchUserItems } from "../api/shop";

const getInitialChatCheck = () => {
  if (typeof window === "undefined") return Date.now();
  const stored = window.localStorage.getItem("lastChatCheck");
  return stored ? Number(stored) : Date.now();
};

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");
const WS_ENDPOINT = `${API_BASE}/ws/chat`;

const resolveAssetUrl = (path) => {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

function HomePage() {
  const navigate = useNavigate();
  const { coins } = useCoins();
  const [isAITooltipOpen, setIsAITooltipOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [diaryModalInitialData, setDiaryModalInitialData] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMemberInfoManageOpen, setIsMemberInfoManageOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [initialChatContact, setInitialChatContact] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showFarmRegisterModal, setShowFarmRegisterModal] = useState(false);
  const [pendingFarmRegisterPrompt, setPendingFarmRegisterPrompt] =
    useState(false);
  const [equipmentMedia, setEquipmentMedia] = useState({});
  const equipmentMediaRef = useRef({});
  const [equippedCharacterVideo, setEquippedCharacterVideo] = useState(null);
  const [equippedCharacterImage, setEquippedCharacterImage] = useState(null);
  const [equippedItemId, setEquippedItemId] = useState(null);
  const [isCharacterHovered, setIsCharacterHovered] = useState(false);
  const characterVideoRef = useRef(null);
  const [showFarmApplyPrompt, setShowFarmApplyPrompt] = useState(false);
  const [pendingFarmApplyPrompt, setPendingFarmApplyPrompt] = useState(false);
  const [isAcknowledgingFarmPrompt, setIsAcknowledgingFarmPrompt] =
    useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const [lastChatCheck, setLastChatCheck] = useState(() =>
    getInitialChatCheck()
  );
  const [shouldQueueFirstTutorial, setShouldQueueFirstTutorial] =
    useState(false);
  const [shouldDelayPostLoginPrompts, setShouldDelayPostLoginPrompts] =
    useState(false);
  const aiImageRef = useRef(null);
  const menuRef = useRef(null);
  const menuIconRef = useRef(null);
  const profileRef = useRef(null);
  const profileIconRef = useRef(null);
  const notificationClientRef = useRef(null);
  const notificationSubscriptionsRef = useRef(new Map());
  const isChatModalOpenRef = useRef(false);

  const canManageMembers =
    profile?.role === "FARMER" || profile?.role === "ADMIN";

  const openMemberInfoManage = () => {
    if (!canManageMembers) {
      alert("농장주만 이용할 수 있는 기능입니다.");
      return;
    }
    setIsMemberInfoManageOpen(true);
  };

  const markChatsRead = useCallback(() => {
    const now = Date.now();
    setLastChatCheck(now);
    setHasUnreadChats(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastChatCheck", String(now));
    }
  }, []);

  const attachRoomSubscriptions = useCallback((rooms) => {
    const client = notificationClientRef.current;
    if (!client || !client.connected) return;
    rooms.forEach((room) => {
      if (notificationSubscriptionsRef.current.has(room.roomId)) {
        return;
      }
      const subscription = client.subscribe(
        `/topic/chat/${room.roomId}`,
        (frame) => {
          try {
            JSON.parse(frame.body);
          } catch (error) {
            console.error("채팅 알림 파싱 실패", error);
          }
          if (!isChatModalOpenRef.current) {
            setHasUnreadChats(true);
          }
        }
      );
      notificationSubscriptionsRef.current.set(room.roomId, subscription);
    });
  }, []);

  const refreshUnreadChats = useCallback(async () => {
    try {
      const rooms = await fetchChatRooms();
      attachRoomSubscriptions(rooms);
      const hasNew = rooms.some((room) => {
        const timestamp = new Date(
          room.lastMessageAt || room.updatedAt
        ).getTime();
        if (!Number.isFinite(timestamp)) return false;
        return timestamp > lastChatCheck;
      });
      if (!isChatModalOpenRef.current) {
        setHasUnreadChats(hasNew);
      }
    } catch (error) {
      console.error("채팅방 목록을 확인하지 못했습니다.", error);
    }
  }, [lastChatCheck, attachRoomSubscriptions]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    isChatModalOpenRef.current = isChatModalOpen;
  }, [isChatModalOpen]);

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      try {
        const data = await fetchMyProfile();
        if (ignore) return;
        setProfile(data);
        setPendingFarmRegisterPrompt(shouldPromptFarmRegistration(data));
        setPendingFarmApplyPrompt(shouldShowFarmApplyPrompt(data));
      } catch (error) {
        console.error("프로필 정보를 불러오지 못했습니다.", error);
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!profile?.userId || typeof window === "undefined") {
      setShouldQueueFirstTutorial(false);
      setShouldDelayPostLoginPrompts(false);
      return;
    }
    const userKey = `user:${profile.userId}`;
    const optOut =
      window.localStorage.getItem(`firstTutorialOptOut:${userKey}`) === "true";
    const sessionShown =
      window.sessionStorage.getItem(`firstTutorialSession:${userKey}`) ===
      "true";
    const needsTutorial = !optOut && !sessionShown;
    setShouldQueueFirstTutorial(needsTutorial);
    setShouldDelayPostLoginPrompts(needsTutorial);
  }, [profile?.userId]);

  useEffect(() => {
    if (!shouldQueueFirstTutorial) {
      return;
    }
    const userKey = profile?.userId ? `user:${profile.userId}` : null;
    if (userKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(`firstTutorialSession:${userKey}`, "true");
    }
    navigate("/first-tutorial", {
      state: { nextPath: "/home", userKey },
    });
    setShouldQueueFirstTutorial(false);
  }, [shouldQueueFirstTutorial, profile?.userId, navigate]);

  useEffect(() => {
    if (shouldDelayPostLoginPrompts) {
      return;
    }
    if (pendingFarmRegisterPrompt) {
      setShowFarmRegisterModal(true);
      setPendingFarmRegisterPrompt(false);
    }
  }, [pendingFarmRegisterPrompt, shouldDelayPostLoginPrompts]);

  useEffect(() => {
    if (shouldDelayPostLoginPrompts) {
      return;
    }
    if (pendingFarmApplyPrompt) {
      setShowFarmApplyPrompt(true);
      setPendingFarmApplyPrompt(false);
    }
  }, [pendingFarmApplyPrompt, shouldDelayPostLoginPrompts]);

  const shouldPromptFarmRegistration = (data) => {
    if (!data) return false;
    const role = data.role;
    const needsRole = role === "FARMER" || role === "ADMIN";
    return needsRole && !data.farmId;
  };

  const shouldShowFarmApplyPrompt = (data) => {
    if (!data) return false;
    return data.role === "USER" && !data.farmPromptShown;
  };

  const updateFarmPromptState = () => {
    setProfile((prev) => (prev ? { ...prev, farmPromptShown: true } : prev));
    setShowFarmApplyPrompt(false);
  };

  const handleFarmPrompt = async (nextAction) => {
    if (isAcknowledgingFarmPrompt) return;
    setIsAcknowledgingFarmPrompt(true);
    try {
      await acknowledgeFarmPrompt();
      updateFarmPromptState();
      if (nextAction === "apply") {
        setIsFarmModalOpen(true);
      }
    } catch (error) {
      console.error("농장 안내 상태를 갱신하지 못했습니다.", error);
    } finally {
      setIsAcknowledgingFarmPrompt(false);
    }
  };

  useEffect(() => {
    equipmentMediaRef.current = equipmentMedia;
  }, [equipmentMedia]);

  const applyEquippedCharacterMedia = useCallback(
    (value, overrideMedia) => {
      const mediaMap = overrideMedia ?? equipmentMediaRef.current;
      if (value == null || value === "") {
        setEquippedCharacterVideo(null);
        setEquippedCharacterImage(null);
        setEquippedItemId(null);
        return;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setEquippedCharacterVideo(null);
        setEquippedCharacterImage(null);
        setEquippedItemId(null);
        return;
      }
      const media = mediaMap?.[parsed];
      if (!media) {
        setEquippedCharacterVideo(null);
        setEquippedCharacterImage(null);
        setEquippedItemId(null);
        return;
      }
      setEquippedCharacterVideo(media.animation ?? null);
      setEquippedCharacterImage(media.equipImage ?? null);
      setEquippedItemId(parsed);
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    applyEquippedCharacterMedia(window.shopEquippedItemId ?? null);

    const handleEquipmentChange = (event) => {
      applyEquippedCharacterMedia(event.detail);
    };

    window.addEventListener("shopEquipmentChange", handleEquipmentChange);
    return () => {
      window.removeEventListener("shopEquipmentChange", handleEquipmentChange);
    };
  }, [applyEquippedCharacterMedia]);

  useEffect(() => {
    let ignore = false;
    async function loadEquipmentMedia() {
      try {
        const [catalog, inventory] = await Promise.all([
          fetchShopItems(),
          fetchUserItems().catch((error) => {
            console.error("보유 아이템 정보를 불러오지 못했습니다.", error);
            return null;
          }),
        ]);
        if (ignore) return;
        const map = {};
        (catalog ?? []).forEach((item) => {
          if (!item?.id) return;
          map[item.id] = {
            equipImage: resolveAssetUrl(item.equippedPhotoUrl),
            animation: resolveAssetUrl(item.animationUrl),
          };
        });
        setEquipmentMedia(map);
        const equippedEntry = Array.isArray(inventory?.items)
          ? inventory.items.find(
              (entry) =>
                entry.status === "EQUIPPED" &&
                (entry.category ?? "tool").toLowerCase() === "tool"
            )
          : null;
        const fallbackEquipped =
          typeof window !== "undefined" ? window.shopEquippedItemId ?? null : null;
        const equippedId = equippedEntry?.itemId ?? fallbackEquipped ?? null;
        if (typeof window !== "undefined") {
          window.shopEquippedItemId = equippedId;
        }
        applyEquippedCharacterMedia(equippedId, map);
      } catch (error) {
        if (!ignore) {
          console.error("상점 장비 정보를 불러오지 못했습니다.", error);
        }
      }
    }
    loadEquipmentMedia();
    return () => {
      ignore = true;
    };
  }, [applyEquippedCharacterMedia]);

  const characterHasVideo = Boolean(equippedCharacterVideo);

  const handleCharacterMouseEnter = () => {
    if (!characterHasVideo) return;
    setIsCharacterHovered(true);
    const video = characterVideoRef.current;
    if (video) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }
  };

  const handleCharacterMouseLeave = () => {
    if (!characterHasVideo) return;
    setIsCharacterHovered(false);
    const video = characterVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const handleImageClick = (route) => {
    navigate(route);
  };

  const openChatModal = (contact = null) => {
    setInitialChatContact(contact);
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
    setInitialChatContact(null);
    markChatsRead();
  };

  const handleAISelect = (type) => {
    if (type === "crop") {
      setIsCropModalOpen(true);
    } else if (type === "info") {
      setIsInfoModalOpen(true);
    }
  };

  const toggleAITooltip = () => {
    setIsAITooltipOpen((prev) => !prev);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!profile) return;
    refreshUnreadChats();
    const interval = setInterval(() => {
      if (!isChatModalOpen) {
        refreshUnreadChats();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [profile, isChatModalOpen, refreshUnreadChats]);

  useEffect(() => {
    if (!profile) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => {
      notificationClientRef.current = client;
      refreshUnreadChats();
    };

    client.onDisconnect = () => {
      notificationSubscriptionsRef.current.forEach((subscription) =>
        subscription.unsubscribe()
      );
      notificationSubscriptionsRef.current.clear();
    };

    client.onStompError = (frame) => {
      console.error("WebSocket STOMP 에러:", frame);
    };

    client.activate();
    notificationClientRef.current = client;

    return () => {
      notificationSubscriptionsRef.current.forEach((subscription) =>
        subscription.unsubscribe()
      );
      notificationSubscriptionsRef.current.clear();
      if (client.active) {
        client.deactivate();
      }
      notificationClientRef.current = null;
    };
  }, [profile, refreshUnreadChats]);

  const handleLogout = async () => {
    try {
      await requestLogout();
    } catch (error) {
      console.error("logout failed", error);
    } finally {
      localStorage.removeItem("authToken");
      if (typeof window !== "undefined" && profile?.userId) {
        window.sessionStorage.removeItem(
          `firstTutorialSession:user:${profile.userId}`
        );
      }
      navigate("/login", { replace: true });
    }
  };

  const menuItems = [
    { label: "재배 일기", onClick: () => setIsDiaryModalOpen(true) },
    { label: "농장 찾기", onClick: () => setIsFarmModalOpen(true) },
    { label: "AI 농사 정보 챗봇", onClick: () => handleAISelect("info") },
    { label: "작물 진단", onClick: () => handleAISelect("crop") },
    { label: "커뮤니티", onClick: () => setIsCommunityModalOpen(true) },
  ];

  const profileItems = [
    {
      label: "계정 관리",
      onClick: () => {
        setIsProfileModalOpen(true);
      },
    },
    ...(canManageMembers
      ? [
          {
            label: "회원 정보 관리",
            onClick: openMemberInfoManage,
          },
        ]
      : []),
    {
      label: "로그아웃",
      onClick: handleLogout,
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isAITooltipOpen &&
        aiImageRef.current &&
        !aiImageRef.current.contains(event.target)
      ) {
        setIsAITooltipOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isAITooltipOpen]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const menuInside =
        menuRef.current && menuRef.current.contains(event.target);
      const menuIconInside =
        menuIconRef.current && menuIconRef.current.contains(event.target);
      if (isMenuOpen && !menuInside && !menuIconInside) {
        setIsMenuOpen(false);
      }

      const profileInside =
        profileRef.current && profileRef.current.contains(event.target);
      const profileIconInside =
        profileIconRef.current && profileIconRef.current.contains(event.target);
      if (isProfileOpen && !profileInside && !profileIconInside) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isMenuOpen, isProfileOpen]);

  return (
    <div className="home-page">
      <div className="background-container">
        <img
          src={BackgroundImg}
          alt="background"
          className="background-image"
        />

        {/* 메뉴 아이콘 */}
        <div
          className="icon-overlay menu-icon"
          onClick={toggleMenu}
          role="button"
          tabIndex={0}
          ref={menuIconRef}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleMenu();
            }
          }}
          aria-expanded={isMenuOpen}
        >
          <img src={MenuIcon} alt="메뉴" />
        </div>

        {isMenuOpen && (
          <div className="menu-panel" ref={menuRef}>
            <div className="menu-panel__header">
              <span className="menu-panel__title">메뉴</span>
              {/* <span className="menu-panel__subtitle">아이콘과 동일한 기능</span> */}
            </div>
            <ul className="menu-panel__list">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="menu-panel__item"
                    onClick={() => {
                      item.onClick();
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 코인 아이콘 */}
        <div className="icon-overlay coin-icon">
          <img src={CoinIcon} alt="코인" />
        </div>

        <div className="coin-label" aria-hidden="true">
          <span>
            x<span>{coins}</span>
          </span>
        </div>

        {/* 채팅 아이콘 */}
        <div
          className={`icon-overlay chat-icon${
            hasUnreadChats ? " chat-icon--unread" : ""
          }`}
          onClick={() => openChatModal()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openChatModal();
            }
          }}
        >
          <img src={ChatIcon} alt="채팅" />
          {hasUnreadChats && (
            <span className="chat-icon-badge" aria-label="읽지 않은 채팅" />
          )}
        </div>

        {/* 마이페이지 아이콘 */}
        <div
          className="icon-overlay mypage-icon"
          onClick={() => setIsProfileOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          ref={profileIconRef}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsProfileOpen((prev) => !prev);
            }
          }}
          aria-expanded={isProfileOpen}
        >
          <img src={MypageIcon} alt="마이페이지" />
        </div>
        {isProfileOpen && (
          <div className="profile-panel" ref={profileRef}>
            <ul className="profile-panel__list">
              {profileItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="profile-panel__item"
                    onClick={() => {
                      item.onClick();
                      setIsProfileOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 튜토리얼 아이콘 */}
        <div
          className="icon-overlay tutorial-icon"
          onClick={() => handleImageClick("/tutorial")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleImageClick("/tutorial");
            }
          }}
        >
          <img src={TutorialIcon} alt="튜토리얼" />
          <div className="image-label">도움말</div>
        </div>

        {/* 재배일기 */}
        <div
          className="clickable-image diary-image"
          onClick={() => setIsDiaryModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsDiaryModalOpen(true);
            }
          }}
        >
          <img src={DiaryIcon} alt="재배일기" />
          <div className="image-label">재배일기</div>
        </div>

        {/* 농장찾기 */}
        <div
          className="clickable-image farm-search-image"
          onClick={() => setIsFarmModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsFarmModalOpen(true);
            }
          }}
        >
          <img src={FarmSearchIcon} alt="농장찾기" />
          <div className="image-label">농장 찾기</div>
        </div>

        {/* 캐릭터 이미지 (클릭으로 상점 열기) */}
        <div
          className="clickable-image character-image"
          onClick={() => setIsShopModalOpen(true)}
          role="button"
          tabIndex={0}
          onMouseEnter={
            characterHasVideo ? handleCharacterMouseEnter : undefined
          }
          onMouseLeave={
            characterHasVideo ? handleCharacterMouseLeave : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsShopModalOpen(true);
            }
          }}
        >
          <img
            src={equippedCharacterImage || CharacterIcon}
            alt="캐릭터"
            className={`character-base-art ${
              equippedItemId ? `character-base-art--item-${equippedItemId}` : ""
            } ${
              characterHasVideo && isCharacterHovered
                ? "character-base-art--hidden"
                : ""
            }`}
          />
          <div className="image-label">캐릭터</div>
        </div>

        {/* 동영상 전용 영역 (호버 시 동영상 재생, 클릭 시 상점 열기) */}
        {characterHasVideo && (
          <div
            className={`character-video-area character-video-area--item-${
              equippedItemId || "default"
            }`}
            onClick={() => setIsShopModalOpen(true)}
            onMouseEnter={handleCharacterMouseEnter}
            onMouseLeave={handleCharacterMouseLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsShopModalOpen(true);
              }
            }}
          >
            <video
              ref={characterVideoRef}
              className={`character-preview-video ${
                isCharacterHovered ? "character-preview-video--visible" : ""
              }`}
              src={equippedCharacterVideo}
              loop
              muted
              playsInline
            />
          </div>
        )}

        {/* 커뮤니티 */}
        <div
          className="clickable-image community-image"
          onClick={() => setIsCommunityModalOpen(true)}
        >
          <img src={CommunityIcon} alt="커뮤니티" />
          <div className="image-label">커뮤니티</div>
        </div>

        {/* AI */}
        <div
          className="clickable-image ai-image"
          ref={aiImageRef}
          onClick={toggleAITooltip}
          role="button"
          tabIndex={0}
          aria-expanded={isAITooltipOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleAITooltip();
            }
          }}
        >
          <img src={AIIcon} alt="AI" />
          <div
            className={`ai-hover-tooltip ${
              isAITooltipOpen ? "ai-hover-tooltip--hidden" : ""
            }`}
            aria-hidden={isAITooltipOpen}
          >
            <span className="ai-hover-item">AI 작물 진단</span>
            <span className="ai-hover-item">AI 농사 정보 챗봇</span>
          </div>

          {isAITooltipOpen && (
            <div className="ai-tooltip" aria-label="AI 기능 선택">
              <button
                type="button"
                className="ai-action-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  handleAISelect("crop");
                }}
              >
                AI 작물 진단
              </button>
              <button
                type="button"
                className="ai-action-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  handleAISelect("info");
                }}
              >
                AI 농사 정보 챗봇
              </button>
            </div>
          )}
        </div>
      </div>

      {isDiaryModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <DiaryModal
              onClose={() => {
                setIsDiaryModalOpen(false);
                setDiaryModalInitialData(null);
              }}
              initialData={diaryModalInitialData}
            />
          </div>
        </div>
      )}
      {isFarmModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <FarmSearchModal
              onClose={() => setIsFarmModalOpen(false)}
              onChatRequest={(farm) => {
                if (!profile?.userId) {
                  alert("로그인 후 채팅을 이용해 주세요.");
                  return;
                }
                if (!farm.ownerId) {
                  alert("농장주 정보를 찾을 수 없습니다.");
                  return;
                }
                setIsFarmModalOpen(false);
                openChatModal({
                  id: `farm-${farm.id}`,
                  name: `${farm.name} 농장주`,
                  farmId: farm.farmId ?? farm.id,
                  farmerId: farm.ownerId,
                  userId: profile?.userId,
                });
              }}
            />
          </div>
        </div>
      )}
      {isCropModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <AICropSearchPage
              onClose={() => setIsCropModalOpen(false)}
              onOpenDiaryModal={(diagnosisData) => {
                setIsCropModalOpen(false);
                setDiaryModalInitialData(diagnosisData);
                setIsDiaryModalOpen(true);
              }}
            />
          </div>
        </div>
      )}
      {isInfoModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <AIInfoSearchPage onClose={() => setIsInfoModalOpen(false)} />
          </div>
        </div>
      )}
      {isCommunityModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <CommunityModal onClose={() => setIsCommunityModalOpen(false)} />
          </div>
        </div>
      )}
      {canManageMembers && isMemberInfoManageOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <MemberInfoManageModal
              profile={profile}
              onClose={() => setIsMemberInfoManageOpen(false)}
            />
          </div>
        </div>
      )}
      {isChatModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <ChatModal
              onClose={handleCloseChatModal}
              initialContact={initialChatContact}
            />
          </div>
        </div>
      )}
      {isShopModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <ShopModal onClose={() => setIsShopModalOpen(false)} />
          </div>
        </div>
      )}
      <ProfilePage
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      {showFarmRegisterModal && (
        <FarmRegisterModal
          onClose={() => setShowFarmRegisterModal(false)}
          onRegistered={(farm) => {
            setProfile((prev) =>
              prev ? { ...prev, farmId: farm.farmId } : prev
            );
            setShowFarmRegisterModal(false);
          }}
        />
      )}
      {showFarmApplyPrompt && (
        <FarmApplyPromptModal
          onApply={() => handleFarmPrompt("apply")}
          onLater={() => handleFarmPrompt("later")}
          disabled={isAcknowledgingFarmPrompt}
        />
      )}
    </div>
  );
}

export default HomePage;
