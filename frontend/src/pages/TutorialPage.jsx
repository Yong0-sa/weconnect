import './TutorialPage.css';
import TutorialImage from '../assets/tutorial page.png';
import TutorialIcon from '../assets/tutorial_icon.png';
import { useNavigate } from 'react-router-dom';

function TutorialPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="tutorial-simple-page">
      <div className="tutorial-image-wrapper">
        <img src={TutorialImage} alt="튜토리얼 화면" className="tutorial-full-image" />
        <button
          type="button"
          className="tutorial-icon-overlay"
          onClick={handleClose}
          aria-label="홈으로 돌아가기"
        >
          <img src={TutorialIcon} alt="튜토리얼 아이콘" />
        </button>
      </div>
    </div>
  );
}

export default TutorialPage;
