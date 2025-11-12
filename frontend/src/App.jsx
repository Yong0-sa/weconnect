import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUp from "./pages/SignUp";
import TutorialPage from "./pages/TutorialPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ProfileCompletePage from "./pages/ProfileCompletePage";
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
        <Route path="/community" element={<div>커뮤니티 (준비중)</div>} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/oauth/success" element={<OAuthCallbackPage />} />
        <Route path="/profile/complete" element={<ProfileCompletePage />} />
      </Routes>
    </Router>
  );
}

export default App;
