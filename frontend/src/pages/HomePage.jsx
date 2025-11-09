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

function HomePage() {
  const navigate = useNavigate();
  const [isAITooltipOpen, setIsAITooltipOpen] = useState(false);
  const aiImageRef = useRef(null);

  const handleImageClick = (route) => {
    navigate(route);
  };

  const handleAISelect = (type) => {
    if (type === "crop") {
      navigate("/ai-crop-search");
    } else if (type === "info") {
      navigate("/ai-info-search");
    }
  };

  const toggleAITooltip = () => {
    setIsAITooltipOpen((prev) => !prev);
  };

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

  return (
    <div className="home-page">
      <div className="background-container">
        <img
          src={BackgroundImg}
          alt="background"
          className="background-image"
        />

        {/* 메뉴 아이콘 */}
        <div className="icon-overlay menu-icon">
          <img src={MenuIcon} alt="메뉴" />
        </div>

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
        <div className="icon-overlay chat-icon">
          <img src={ChatIcon} alt="채팅" />
        </div>

        {/* 마이페이지 아이콘 */}
        <div className="icon-overlay mypage-icon">
          <img src={MypageIcon} alt="마이페이지" />
        </div>

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
          onClick={() => handleImageClick("/diary")}
        >
          <img src={DiaryIcon} alt="재배일기" />
          <div className="image-label">재배일기</div>
        </div>

        {/* 농장찾기 */}
        <div
          className="clickable-image farm-search-image"
          onClick={() => handleImageClick("/farm-search")}
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
    </div>
  );
}

export default HomePage;
