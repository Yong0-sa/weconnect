import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUp from "./pages/SignUp";
import TutorialPage from "./pages/TutorialPage";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import { CoinProvider } from "./contexts/CoinContext";
import "./App.css";

function App() {
  return (
    <Router>
      <CoinProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/oauth/success" element={<OAuthCallbackPage />} />
        </Routes>
      </CoinProvider>
    </Router>
  );
}

export default App;
