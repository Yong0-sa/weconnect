import "./LoginPage.css";
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import BackgroundBlur from "../assets/backgroud_blur.png";
import LogoImage from "../assets/로고.png";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 📌 로그인 입력 필드 + 상태 관리
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [rememberId, setRememberId] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================
  // 📌 최초 렌더링 시 localStorage에 저장된 이메일 복원
  // ============================================================
  useEffect(() => {
    const storedEmail = localStorage.getItem("rememberedEmail");
    if (storedEmail) {
      setCredentials((prev) => ({ ...prev, email: storedEmail }));
      setRememberId(true);
    }
  }, []);

  // ============================================================
  // 📌 URL 파라미터(status, message)로 전달된 외부 토스트 표시
  //    (회원가입 성공 → 로그인 페이지로 redirect 시 사용)
  // ============================================================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const message = params.get("message");
    if (status && message) {
      setToast({
        type: status === "success" ? "success" : "error",
        message,
      });
      navigate(location.pathname, { replace: true });  // 파라미터 제거
    }
  }, [location, navigate]);


  // ============================================================
  // 📌 이메일/비밀번호 각각 최소 검증
  // ============================================================
  const getFieldError = (field, value) => {
    const trimmed = value.trim();

    if (field === "email") {
      if (!trimmed) return "이메일을 입력해 주세요.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "올바른 이메일 형식을 입력해 주세요.";
      }
    }

    if (field === "password") {
      if (!trimmed) return "비밀번호를 입력해 주세요.";
      if (trimmed.length < 4) return "비밀번호는 8자 이상 입력해 주세요.";
    }

    return "";
  };

  // ============================================================
  // 📌 입력 변경 시 상태 업데이트 + 유효성 재검증
  //    - 이메일 저장 체크박스 선택 시 즉시 localStorage 반영
  // ============================================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setCredentials((prev) => {
      const next = { ...prev, [name]: value };

      // 필드 검증 갱신
      setErrors((prevErrors) => {
        const updated = { ...prevErrors };
        const msg = getFieldError(name, value);
        if (msg) updated[name] = msg;
        else delete updated[name];
        return updated;
      });

      return next;
    });

    // 이메일 저장 모드일 때만 즉시 반영
    if (name === "email" && rememberId) {
      const trimmed = value.trim();
      if (trimmed) localStorage.setItem("rememberedEmail", trimmed);
      else localStorage.removeItem("rememberedEmail");
    }
    setToast(null);  // 입력 시 이전 에러 토스트 삭제
  };

  // ============================================================
  // 📌 이메일 저장 체크박스 토글 시 localStorage 반영
  // ============================================================
  const handleRememberToggle = (event) => {
    const { checked } = event.target;
    setRememberId(checked);

    if (checked) {
      const trimmedEmail = credentials.email.trim();
      if (trimmedEmail) {
        localStorage.setItem("rememberedEmail", trimmedEmail);
      }
    } else {
      localStorage.removeItem("rememberedEmail");
    }
  };

  // ============================================================
  // 📌 제출 전 폼 전체 검증
  // ============================================================
  const validateForm = () => {
    const fieldErrors = {};
    ["email", "password"].forEach((field) => {
      const message = getFieldError(field, credentials[field]);
      if (message) fieldErrors[field] = message;
    });
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  // ============================================================
  // 📌 로그인 요청 흐름
  //    - 입력 검증 → fetch 요청 → 응답 처리 → 홈 이동
  // ============================================================
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      setToast({
        type: "error",
        message: "입력 값을 다시 확인해 주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      email: credentials.email.trim(),
      password: credentials.password,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setToast({
          type: "error",
          message: data?.message || "로그인 정보가 일치하지 않습니다.",
        });
        return;
      }

      // JWT 사용 시 token 저장 지원
      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }

      // 아이디 저장 처리
      if (rememberId && payload.email) {
        localStorage.setItem("rememberedEmail", payload.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      setToast({
        type: "success",
        message: data?.message || "로그인되었습니다.",
      });

      // 세션 쿠키 설정을 위한 딜레이
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 300);

    } catch (error) {
      setToast({
        type: "error",
        message: "서버와 통신할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // 📌 소셜 로그인 (Google OAuth2)
  // ============================================================
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  };

  return (
    <div className="login-page">
      <div className="login-stage">
        <div className="login-bg" aria-hidden="true">
          <img src={BackgroundBlur} alt="blurred background" />
        </div>

        <div className="login-logo-layer" aria-hidden="true">
          <img src={LogoImage} alt="위커넥트 로고" />
        </div>

        <div className="login-overlay">
          {toast && (
            <div
              className={`login-toast login-toast--${toast.type}`}
              role="status"
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="알림 닫기"
              >
                ×
              </button>
            </div>
          )}

          <form className="login-modal" onSubmit={handleSubmit} noValidate>
            <div className="login-modal__header">계정 로그인</div>

            <div className="login-form-grid">
              <div className="login-input-column">
                <div className="login-field">
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={credentials.email}
                    onChange={handleChange}
                    placeholder="이메일을 입력하세요"
                  />
                </div>
                {errors.email && (
                  <p className="login-field-error">{errors.email}</p>
                )}

                <div className="login-field">
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>
                {errors.password && (
                  <p className="login-field-error">{errors.password}</p>
                )}
              </div>

              <div className="login-submit-column">
                <button
                  type="submit"
                  className="login-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "로그인 중..." : "로그인"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-checkbox">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={handleRememberToggle}
                />
                아이디 저장
              </label>
            </div>

            <div className="login-helper-links">
              <button type="button">아이디 찾기</button>
              <span> | </span>
              <button type="button">비밀번호 찾기</button>
              <span> | </span>
              <Link to="/signup">회원가입</Link>
            </div>

            <div className="social-login-section">
              <div className="social-login-divider">
                <span />
                <p>또는 소셜 계정으로 로그인</p>
                <span />
              </div>
              <button
                type="button"
                className="google-login-btn"
                onClick={handleGoogleLogin}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.1 28.1 4 22 4 10 4 0 14 0 26s10 22 22 22c11 0 21-8 21-22 0-1.9-.2-3.6-.4-5.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6 14.1l6.6 4.8C14.3 15.4 18.8 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.1 28.1 4 22 4 14.1 4 7.1 8.2 3 14.1z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.3 0 10.1-1.8 13.8-4.9l-6.3-5.3C29.5 35.8 26.9 36.7 24 36c-5.4 0-9.8-3.6-11.3-8.5L6 32.4C9.9 39.4 16.4 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.9 2.7-2.8 5-5.3 6.5l6.3 5.3c3.6-3.3 5.7-8.1 5.7-13.8 0-1.9-.2-3.6-.4-5.5z"
                  />
                </svg>
                구글로 계속하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
