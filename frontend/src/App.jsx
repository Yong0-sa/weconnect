import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUp from "./pages/SignUp";
import TutorialPage from "./pages/TutorialPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AccountDeletePage from "./pages/AccountDeletePage";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/store" element={<div>캐릭터 상점 (준비중)</div>} />
        <Route path="/diary" element={<div>성장 일기 (준비중)</div>} />
        <Route path="/farm-search" element={<div>농장찾기 (준비중)</div>} />
        <Route path="/community" element={<div>커뮤니티 (준비중)</div>} />
        <Route path="/ai-info-search" element={<div>AI정보검사(준비중)</div>} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/withdraw" element={<AccountDeletePage />} />
      </Routes>
    </Router>
  );
}

export default App;
