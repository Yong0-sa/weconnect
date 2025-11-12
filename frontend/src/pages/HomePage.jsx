import { useEffect, useRef, useState } from "react";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";
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

function HomePage() {
  const navigate = useNavigate();
  const [isAITooltipOpen, setIsAITooltipOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const aiImageRef = useRef(null);
  const menuRef = useRef(null);
  const menuIconRef = useRef(null);
  const profileRef = useRef(null);
  const profileIconRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleImageClick = (route) => {
    navigate(route);
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

  const menuItems = [
    { label: "재배 일기", onClick: () => setIsDiaryModalOpen(true) },
    { label: "농장 찾기", onClick: () => setIsFarmModalOpen(true) },
    { label: "AI 농사 정보 챗봇", onClick: () => handleAISelect("info") },
    { label: "작물 진단", onClick: () => handleAISelect("crop") },
    { label: "커뮤니티", onClick: () => handleImageClick("/community") },
  ];

  const profileItems = [
    {
      label: "회원정보수정",
      onClick: () => {
        setIsProfileModalOpen(true);
      },
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
            x<span>3</span>
          </span>
        </div>

        {/* 채팅 아이콘 */}
        <div
          className="icon-overlay chat-icon"
          onClick={() => handleImageClick("/chat")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleImageClick("/chat");
            }
          }}
        >
          <img src={ChatIcon} alt="채팅" />
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

        {/* 캐릭터 */}
        <div
          className="clickable-image character-image"
          onClick={() => handleImageClick("/store")}
        >
          <img src={CharacterIcon} alt="캐릭터" />
          <div className="image-label">캐릭터</div>
        </div>

        {/* 커뮤니티 */}
        <div
          className="clickable-image community-image"
          onClick={() => handleImageClick("/community")}
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
            <DiaryModal onClose={() => setIsDiaryModalOpen(false)} />
          </div>
        </div>
      )}
      {isFarmModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <FarmSearchModal onClose={() => setIsFarmModalOpen(false)} />
          </div>
        </div>
      )}
      {isCropModalOpen && (
        <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
          <div className="crop-modal">
            <AICropSearchPage onClose={() => setIsCropModalOpen(false)} />
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
      <ProfilePage
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default HomePage;
