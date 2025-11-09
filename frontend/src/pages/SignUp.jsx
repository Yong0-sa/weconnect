import "./SignUp.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundBlur from "../assets/backgroud_blur.png";

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    farmName: "",
  });
  const [memberType, setMemberType] = useState("personal");
  const [errors, setErrors] = useState({});
  const [emailStatus, setEmailStatus] = useState({
    state: "idle",
    message: "",
  });
  const [notification, setNotification] = useState(null);

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
      case "farmName":
        if (memberType === "farmer" && !trimmed) {
          return "농장 이름을 입력해 주세요.";
        }
        return "";
      default:
        return "";
    }
  };

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

      if (name === "email") {
        setEmailStatus({ state: "idle", message: "" });
        setNotification(null);
      }

      return nextState;
    });
  };

  const handleTypeChange = (type) => {
    setMemberType(type);
    if (type === "personal") {
      setFormData((prev) => ({ ...prev, farmName: "" }));
      setErrors((prev) => {
        const { farmName, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = () => {
    const fields = [
      "email",
      "nickname",
      "password",
      "confirmPassword",
      "name",
      "phone",
    ];
    if (memberType === "farmer") {
      fields.push("farmName");
    }

    const newErrors = {};
    fields.forEach((field) => {
      const message = getFieldError(field, formData[field]);
      if (message) {
        newErrors[field] = message;
      }
    });

    if (!newErrors.email && emailStatus.state !== "verified") {
      newErrors.email = "이메일 인증을 완료해 주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyEmail = () => {
    const message = getFieldError("email", formData.email);
    if (message) {
      setErrors((prev) => ({ ...prev, email: message }));
      setEmailStatus({ state: "idle", message: "" });
      setNotification(null);
      return;
    }

    if (emailStatus.state === "verified") {
      return;
    }

    if (formData.email.trim().toLowerCase() === "test@gmail.com") {
      setEmailStatus({
        state: "verified",
        message: "테스트 이메일 인증이 완료되었습니다.",
      });
      setNotification({
        type: "success",
        message: "테스트 이메일 인증이 완료되었습니다.",
      });
      return;
    }

    setEmailStatus({
      state: "sent",
      message:
        "인증 메일이 발송되었습니다. 메일에 포함된 링크를 눌러 인증을 완료해 주세요.",
    });
    setNotification({
      type: "info",
      message: "인증 메일이 발송되었습니다. 이메일을 확인해 주세요.",
    });
  };

  const handleConfirmEmailVerification = () => {
    if (emailStatus.state !== "sent") return;
    setEmailStatus({
      state: "verified",
      message: "이메일 인증이 완료되었습니다.",
    });
    setNotification({
      type: "success",
      message: "이메일 인증이 완료되었습니다.",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    console.log("회원가입 완료:", { ...formData, memberType });
    navigate("/login");
  };

  return (
    <div className="signup-page">
      <div className="signup-bg" aria-hidden="true">
        <img src={BackgroundBlur} alt="blurred background" />
      </div>

      <form className="modal-content" onSubmit={handleSubmit} noValidate>
        <div className="modal-header">
          <h1>회원가입</h1>
        </div>

        <div className="modal-fields">
          {notification && (
            <div
              className={`signup-toast signup-toast--${notification.type}`}
              role="status"
            >
              <span>{notification.message}</span>
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => setNotification(null)}
              >
                ×
              </button>
            </div>
          )}

          <label className="signup-label" htmlFor="email">
            이메일
          </label>
          <div className="email-inline">
            <input
              id="email"
              className="signup-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일을 입력해주세요."
            />
            <button
              type="button"
              className="verify-btn"
              onClick={handleVerifyEmail}
              disabled={emailStatus.state === "verified"}
            >
              {emailStatus.state === "verified" ? "인증 완료" : "인증"}
            </button>
          </div>
          {errors.email && <p className="input-error">{errors.email}</p>}
          {emailStatus.message && (
            <p
              className={`verification-message verification-message--${emailStatus.state}`}
            >
              {emailStatus.message}
            </p>
          )}
          {emailStatus.state === "sent" && (
            <button
              type="button"
              className="verify-complete-btn"
              onClick={handleConfirmEmailVerification}
            >
              이메일 인증을 완료했어요
            </button>
          )}

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

          <label className="signup-label" htmlFor="memberType">
            회원 유형
          </label>
          <div className="member-type" role="group" aria-label="회원 유형 선택">
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

              <label className="signup-label" htmlFor="farmName">
                농장 이름
              </label>
              <input
                id="farmName"
                className="signup-input"
                type="text"
                name="farmName"
                value={formData.farmName}
                onChange={handleChange}
                placeholder="농장 이름을 입력해 주세요."
              />
              {errors.farmName && (
                <p className="input-error">{errors.farmName}</p>
              )}
            </>
          )}

          <button type="submit" className="submit-btn">
            가입하기
          </button>
        </div>
      </form>
    </div>
  );
}

export default SignUp;
