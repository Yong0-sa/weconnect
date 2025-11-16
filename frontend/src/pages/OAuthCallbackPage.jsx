import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OAuthCallbackPage.css";

function OAuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // 📌 콜백 상태 UI (처리중 / 성공 / 실패)
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState(
    "소셜 로그인 정보를 확인하고 있어요..."
  );

  useEffect(() => {
    // ============================================================
    // 📌 OAuth 콜백 URL 분석
    //     - token: 로그인 성공 시 전달되는 사용자 토큰
    //     - needsProfileCompletion: 추가 정보 입력 필요 여부
    // ============================================================
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const resultStatus = params.get("status") || "success";
    const errorMessage = params.get("message");
    const needsProfileCompletion =
      params.get("needsProfileCompletion") === "true";

    // ============================================================
    // 📌 1) 추가 회원정보 입력이 필요한 경우 → 프로필 입력 페이지로 이동
    // ============================================================
    if (needsProfileCompletion && token) {
      const nextParams = new URLSearchParams();
      nextParams.set("status", resultStatus);
      nextParams.set("token", token);
      if (errorMessage) {
        nextParams.set("message", errorMessage);
      }

      navigate(`/profile/complete?${nextParams.toString()}`, {
        replace: true,
      });
      return;
    }

    // ============================================================
    // 📌 2) 인증 실패 또는 토큰 없음 → 에러 안내 후 로그인 화면으로 이동
    // ============================================================
    if (resultStatus !== "success" || !token) {
      setStatus("error");
      setMessage(
        errorMessage || "소셜 로그인에 실패했습니다. 다시 시도해 주세요."
      );

      const timeout = setTimeout(
        () => navigate("/login", { replace: true }),
        2000
      );
      return () => clearTimeout(timeout);
    }

    // ============================================================
    // 📌 3) 정상 로그인 → 토큰 저장 → 홈으로 이동
    // ============================================================
    localStorage.setItem("authToken", token);
    setStatus("success");
    setMessage("로그인이 완료되었습니다. 잠시 후 홈으로 이동합니다.");
    
    const timeout = setTimeout(
      () => navigate("/home", { replace: true }),
      1200
    );
    return () => clearTimeout(timeout);
  }, [location, navigate]);

  return (
    <div className="oauth-callback">
      <div className={`oauth-card oauth-card--${status}`}>
        <div className="oauth-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
