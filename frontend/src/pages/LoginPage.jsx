import "./LoginPage.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BackgroundBlur from "../assets/backgroud_blur.png";
import LogoImage from "../assets/로고.png";

function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [rememberId, setRememberId] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

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
      if (trimmed.length < 4) return "비밀번호는 4자 이상 입력해 주세요.";
    }
    return "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => {
      const next = { ...prev, [name]: value };
      setErrors((prevErrors) => {
        const updated = { ...prevErrors };
        const msg = getFieldError(name, value);
        if (msg) updated[name] = msg;
        else delete updated[name];
        return updated;
      });
      return next;
    });
    setToast(null);
  };

  const validateForm = () => {
    const fieldErrors = {};
    ["email", "password"].forEach((field) => {
      const message = getFieldError(field, credentials[field]);
      if (message) fieldErrors[field] = message;
    });
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) {
      setToast({
        type: "error",
        message: "입력 값을 다시 확인해 주세요.",
      });
      return;
    }
    if (
      credentials.email.trim().toLowerCase() === "test@gmail.com" &&
      credentials.password === "test1234"
    ) {
      navigate("/home");
      return;
    }

    setToast({
      type: "error",
      message: "로그인 정보가 일치하지 않습니다.",
    });
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <img src={BackgroundBlur} alt="blurred background" />
      </div>

      <div className="login-logo-layer" aria-hidden="true">
        <img src={LogoImage} alt="위커넥트 로고" />
      </div>

      <div className="login-overlay">
        {toast && (
          <div className={`login-toast login-toast--${toast.type}`} role="status">
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="알림 닫기">
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
              {errors.email && <p className="login-field-error">{errors.email}</p>}

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
              <button type="submit" className="login-btn">
                로그인
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(event) => setRememberId(event.target.checked)}
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
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
