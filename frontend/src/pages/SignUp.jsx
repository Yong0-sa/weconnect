import "./SignUp.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BackgroundBlur from "../assets/backgroud_blur.png";
import { signUp, login as loginRequest } from "../api/auth";

function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------------------------------------
  // 📌 가입 폼 데이터 + 상태
  // ------------------------------------------------------------
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });

  const [memberType, setMemberType] = useState("personal");
  const [errors, setErrors] = useState({});
  const [isSocialSignup, setIsSocialSignup] = useState(false);
  const [socialInfo, setSocialInfo] = useState({
    provider: "",
    message: "",
  });

  // ------------------------------------------------------------
  // 📌 소셜 로그인 후 진입 시 이메일/메시지 세팅
  // ------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const emailParam = params.get("email");

    if (status === "social_signup" && emailParam) {
      setIsSocialSignup(true);

      const provider = params.get("provider") || "SNS";
      const displayName = params.get("name") || "";

      setFormData((prev) => ({
        ...prev,
        email: emailParam,
      }));

      setSocialInfo({
        provider,
        message: `${provider.toUpperCase()} 계정으로 이메일이 고정되어 있어요. 아래 정보만 입력하면 가입이 완료됩니다.`,
      });

      setMemberType("personal");
    }
  }, [location.search]);

  // ------------------------------------------------------------
  // 📌 단일 필드 검증
  // ------------------------------------------------------------
  const getFieldError = (field, value, nextState = formData) => {
    const trimmed = value?.trim() ?? "";

    switch (field) {
      case "email":
        if (!trimmed) return "이메일을 입력해 주세요.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return "올바른 이메일 주소를 입력해 주세요.";
        }
        return "";

      case "nickname":
        if (!trimmed) return "닉네임을 입력해 주세요.";
        return "";

      case "password":
        if (!trimmed) return "비밀번호를 입력해 주세요.";
        if (trimmed.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
        return "";

      case "confirmPassword":
        if (!trimmed) return "비밀번호를 다시 입력해 주세요.";
        if (trimmed !== nextState.password) {
          return "비밀번호가 일치하지 않습니다.";
        }
        return "";

      case "name":
        if (!trimmed) return "이름을 입력해 주세요.";
        return "";

      case "phone":
        if (!trimmed) return "전화번호를 입력해 주세요.";
        if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(trimmed)) {
          return "전화번호는 010-1234-5678 형식으로 입력해 주세요.";
        }
        return "";

      default:
        return "";
    }
  };

  // ------------------------------------------------------------
  // 📌 입력 변경 핸들러 (실시간 검증 + 상태 업데이트)
  // ------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const nextState = { ...prev, [name]: value };

      setErrors((prevErrors) => {
        const updated = { ...prevErrors };

        const fieldMessage = getFieldError(name, value, nextState);
        if (fieldMessage) {
          updated[name] = fieldMessage;
        } else {
          delete updated[name];
        }

        // 비밀번호 바꿀 때 confirmPassword 즉시 재검증
        if (name === "password") {
          const confirmMessage = getFieldError(
            "confirmPassword",
            nextState.confirmPassword,
            nextState
          );
          if (confirmMessage) {
            updated.confirmPassword = confirmMessage;
          } else {
            delete updated.confirmPassword;
          }
        }

        return updated;
      });

      return nextState;
    });
  };

  // ------------------------------------------------------------
  // 📌 회원 유형(개인 / 농장주)
  // ------------------------------------------------------------
  const handleTypeChange = (type) => {
    setMemberType(type);
  };

  // ------------------------------------------------------------
  // 📌 폼 전체 검증
  // ------------------------------------------------------------
  const validateForm = () => {
    const fields = [
      "email",
      "nickname",
      "password",
      "confirmPassword",
      "name",
      "phone",
    ];

    const newErrors = {};

    fields.forEach((field) => {
      const message = getFieldError(field, formData[field]);
      if (message) {
        newErrors[field] = message;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ------------------------------------------------------------
  // 📌 제출 핸들러 (회원가입 → 소셜 로그인 시 자동 로그인)
  // ------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { email, nickname, password, name, phone } = formData;

    try {
      const isFarmer = memberType === "farmer";

      const payload = {
        email,
        nickname,
        password,
        name,
        phone,
        memberType: isFarmer ? "FARMER" : "PERSONAL",
      };

      // 회원가입 요청
      await signUp(payload);

      // 소셜 가입자의 경우 → 자동 로그인
      if (isSocialSignup) {
        try {
          const loginResponse = await loginRequest({ email, password });

          if (loginResponse?.token) {
            localStorage.setItem("authToken", loginResponse.token);
          }

          navigate("/home", { replace: true });
          return;
        } catch (loginErr) {
          console.error(loginErr);
          navigate("/login", { replace: true });
          return;
        }
      }

      // 일반 가입자 → 로그인 화면 이동
      alert("회원가입 완료");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert(err?.message || "회원가입 실패");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-bg" aria-hidden="true">
        <img src={BackgroundBlur} alt="blurred background" />
      </div>

      <div className="signup-modal-shell">
        <button
          type="button"
          className="signup-close-btn"
          aria-label="회원가입 닫기"
          onClick={() => navigate("/login")}
        >
          ×
        </button>
        <form className="modal-content" onSubmit={handleSubmit} noValidate>
        <div className="modal-header">
          <h1>회원가입</h1>
        </div>

        <div className="modal-fields">
          {isSocialSignup && (
            <div className="social-signup-info">
              <strong>{socialInfo.provider.toUpperCase()}</strong>{" "}
              {socialInfo.message}
            </div>
          )}
          <label className="signup-label" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            className="signup-input"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="이메일을 입력해주세요."
            disabled={isSocialSignup}
            readOnly={isSocialSignup}
          />
          {errors.email && <p className="input-error">{errors.email}</p>}

          <label className="signup-label" htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            className="signup-input"
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            placeholder="닉네임을 입력해 주세요."
          />
          {errors.nickname && <p className="input-error">{errors.nickname}</p>}

          <label className="signup-label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            className="signup-input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="비밀번호를 입력해 주세요."
          />
          {errors.password && <p className="input-error">{errors.password}</p>}

          <label className="signup-label" htmlFor="confirmPassword">
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            className="signup-input"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="비밀번호를 다시 입력해 주세요."
          />
          {errors.confirmPassword && (
            <p className="input-error">{errors.confirmPassword}</p>
          )}

          <>
            <label className="signup-label" htmlFor="memberType">
              회원 유형
            </label>
            <div
              className="member-type"
              role="group"
              aria-label="회원 유형 선택"
            >
              <button
                type="button"
                className={`type-btn ${
                  memberType === "personal" ? "active" : ""
                }`}
                onClick={() => handleTypeChange("personal")}
              >
                개인
              </button>
              <button
                type="button"
                className={`type-btn ${
                  memberType === "farmer" ? "active" : ""
                }`}
                onClick={() => handleTypeChange("farmer")}
              >
                농장주
              </button>
            </div>
          </>

          {memberType === "personal" && (
            <>
              <label className="signup-label" htmlFor="name-personal">
                이름
              </label>
              <input
                id="name-personal"
                className="signup-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력해 주세요."
              />
              {errors.name && <p className="input-error">{errors.name}</p>}

              <label className="signup-label" htmlFor="phone-personal">
                전화번호
              </label>
              <input
                id="phone-personal"
                className="signup-input"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-1234-5678"
              />
              {errors.phone && <p className="input-error">{errors.phone}</p>}
            </>
          )}

          {memberType === "farmer" && (
            <>
              <label className="signup-label" htmlFor="name-farmer">
                이름
              </label>
              <input
                id="name-farmer"
                className="signup-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력해 주세요."
              />
              {errors.name && <p className="input-error">{errors.name}</p>}

              <label className="signup-label" htmlFor="phone-farmer">
                전화번호
              </label>
              <input
                id="phone-farmer"
                className="signup-input"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-1234-5678"
              />
              {errors.phone && <p className="input-error">{errors.phone}</p>}
            </>
          )}

          <button type="submit" className="submit-btn">
            가입하기
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default SignUp;
