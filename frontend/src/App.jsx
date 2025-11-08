import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SignUp from './pages/SignUp';
import TutorialPage from './pages/TutorialPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/store" element={<div>캐릭터 상점 (준비중)</div>} />
        <Route path="/diary" element={<div>재배일기 (준비중)</div>} />
        <Route path="/farm-search" element={<div>농장찾기 (준비중)</div>} />
        <Route path="/community" element={<div>커뮤니티 (준비중)</div>} />
        <Route path="/ai-crop-search" element={<div>AI작물검색 (준비중)</div>} />
        <Route path="/ai-info-search" element={<div>AI정보검색 (준비중)</div>} />
      </Routes>
    </Router>
  );
}

export default App;
