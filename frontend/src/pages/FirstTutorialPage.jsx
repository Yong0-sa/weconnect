import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./FirstTutorialPage.css";
import FirstTutorialImage from "../assets/first tutorial page.png";
import { fetchMyProfile } from "../api/profile";

const DEFAULT_REDIRECT = "/home";

function FirstTutorialPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialNextPath =
    typeof location.state?.nextPath === "string"
      ? location.state.nextPath
      : DEFAULT_REDIRECT;
  const initialUserKey =
    typeof location.state?.userKey === "string"
      ? location.state.userKey
      : null;

  const [nextPath] = useState(initialNextPath);
  const [userKey, setUserKey] = useState(initialUserKey);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialUserKey);
  const [errorMessage, setErrorMessage] = useState(null);
  const sessionKey = userKey ? `firstTutorialSession:${userKey}` : null;

  useEffect(() => {
    if (typeof window === "undefined" || !userKey) {
      return;
    }
    const optOut =
      window.localStorage.getItem(`firstTutorialOptOut:${userKey}`) === "true";
    setDontShowAgain(optOut);
  }, [userKey]);

  useEffect(() => {
    if (userKey || typeof window === "undefined") {
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function resolveProfile() {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        if (profile?.userId) {
          setUserKey(`user:${profile.userId}`);
        } else {
          throw new Error("회원 정보를 찾을 수 없습니다.");
        }
      } catch (error) {
        if (cancelled) return;
        const message = error?.message || "회원 정보를 불러오지 못했습니다.";
        if (message.includes("로그인이 필요")) {
          navigate("/login", { replace: true });
          return;
        }
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    resolveProfile();
    return () => {
      cancelled = true;
    };
  }, [userKey, navigate]);

  useEffect(() => {
    if (!sessionKey || typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(sessionKey, "true");
  }, [sessionKey]);

  const persistPreferences = () => {
    if (!userKey || typeof window === "undefined") {
      return;
    }
    const optOutKey = `firstTutorialOptOut:${userKey}`;
    if (dontShowAgain) {
      window.localStorage.setItem(optOutKey, "true");
    } else {
      window.localStorage.removeItem(optOutKey);
    }
    if (sessionKey) {
      window.sessionStorage.setItem(sessionKey, "true");
    }
  };

  const handleClose = () => {
    persistPreferences();
    navigate(nextPath, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="first-tutorial-page first-tutorial-page--loading">
        <p>튜토리얼 페이지를 준비하는 중입니다...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="first-tutorial-page first-tutorial-page--loading">
        <div className="first-tutorial-error-card">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => navigate("/home", { replace: true })}>
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="first-tutorial-page" aria-live="polite">
      <img
        src={FirstTutorialImage}
        alt="첫 로그인 튜토리얼"
        className="first-tutorial-full-image"
      />
      <div className="first-tutorial-controls">
        <label className="first-tutorial-checkbox">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>다시 보지 않음</span>
        </label>
        <button
          type="button"
          className="first-tutorial-close-btn"
          onClick={handleClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default FirstTutorialPage;
