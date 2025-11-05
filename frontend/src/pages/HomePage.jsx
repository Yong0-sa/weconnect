import './HomePage.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackgroundImg from '../assets/backgroud 1.png';
import AIIcon from '../assets/AI.png';
import FarmSearchIcon from '../assets/농장찾기.png';
import DiaryIcon from '../assets/재배일기.png';
import CommunityIcon from '../assets/커뮤니티.png';
import CharacterIcon from '../assets/캐릭터.png';

function HomePage() {
  const [showAIModal, setShowAIModal] = useState(false);
  const navigate = useNavigate();

  // ===== AI 서버 연동 테스트 코드 시작 (언제든 삭제 가능) =====
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    // 페이지 로드 시 AI 서버에서 메시지 가져오기
    const fetchAIMessage = async () => {
      try {
        const response = await axios.get('/api/ai/hello');
        setAiMessage(response.data);
      } catch (error) {
        console.error('AI 서버 연결 실패:', error);
        setAiMessage('AI 서버 연결 실패');
      }
    };

    fetchAIMessage();
  }, []);
  // ===== AI 서버 연동 테스트 코드 끝 =====

  const handleImageClick = (route) => {
    if (route === 'ai') {
      setShowAIModal(!showAIModal);
    } else {
      navigate(route);
    }
  };

  const handleAISelect = (type) => {
    if (type === 'crop') {
      navigate('/ai-crop-search');
    } else if (type === 'info') {
      navigate('/ai-info-search');
    }
  };

  return (
    <div className="home-page">
      {/* ===== AI 서버 메시지 표시 영역 시작 (언제든 삭제 가능) ===== */}
      {aiMessage && (
        <div className="ai-message-banner">
          {aiMessage}
        </div>
      )}
      {/* ===== AI 서버 메시지 표시 영역 끝 ===== */}

      <div className="background-container">
        <img src={BackgroundImg} alt="background" className="background-image" />
      {/* 재배일기 */}
      <div
        className="clickable-image diary-image"
        onClick={() => handleImageClick('/diary')}
        data-tooltip="재배일기"
      >
        <img src={DiaryIcon} alt="재배일기" />
      </div>

      {/* 농장찾기 */}
      <div
        className="clickable-image farm-search-image"
        onClick={() => handleImageClick('/farm-search')}
        data-tooltip="농장찾기"
      >
        <img src={FarmSearchIcon} alt="농장찾기" />
      </div>

      {/* 캐릭터 */}
      <div
        className="clickable-image character-image"
        onClick={() => handleImageClick('/store')}
        data-tooltip="캐릭터"
      >
        <img src={CharacterIcon} alt="캐릭터" />
      </div>

      {/* 커뮤니티 */}
      <div
        className="clickable-image community-image"
        onClick={() => handleImageClick('/community')}
        data-tooltip="커뮤니티"
      >
        <img src={CommunityIcon} alt="커뮤니티" />
      </div>

      {/* AI */}
      <div
        className="clickable-image ai-image"
        onClick={() => handleImageClick('ai')}
      >
        <img src={AIIcon} alt="AI" />

        {/* AI 선택 메뉴 */}
        {showAIModal && (
          <div className="ai-menu">
            <button
              className="ai-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleAISelect('crop');
              }}
            >
              AI작물검색
            </button>
            <button
              className="ai-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleAISelect('info');
              }}
            >
              AI정보검색
            </button>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}

export default HomePage;
