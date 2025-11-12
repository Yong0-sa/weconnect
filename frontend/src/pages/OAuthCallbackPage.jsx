import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OAuthCallbackPage.css";

function OAuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState(
    "소셜 로그인 정보를 확인하고 있어요..."
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const resultStatus = params.get("status") || "success";
    const errorMessage = params.get("message");
    const needsProfileCompletion =
      params.get("needsProfileCompletion") === "true";

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
