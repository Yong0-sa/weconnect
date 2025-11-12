import "./ProfileCompletePage.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMyProfile, updateProfile } from "../api/profile";

const PHONE_PLACEHOLDERS = ["010-0000-0000", "010-1234-1234"];
const sanitizePhone = (value) =>
  value && !PHONE_PLACEHOLDERS.includes(value) ? value : "";

function ProfileCompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ nickname: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
    }
    const initialStatus = params.get("status");
    const errorMessage = params.get("message");
    if (initialStatus === "error" && errorMessage) {
      setStatus({ type: "error", message: errorMessage });
    }

    async function init() {
      setIsLoading(true);
      try {
        const data = await fetchMyProfile();
        setProfile(data);
        setFormData({
          nickname: data.nickname || "",
          phone: sanitizePhone(data.phone),
        });
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [location]);

  const getFieldError = (field, value) => {
    const trimmed = value.trim();
    if (field === "nickname") {
      if (!trimmed) return "닉네임을 입력해 주세요.";
    }
    if (field === "phone") {
      if (!trimmed) return "전화번호를 입력해 주세요.";
      if (!/^(\d{2,3}-\d{3,4}-\d{4})$/.test(trimmed)) {
        return "010-1234-5678 형식으로 입력해 주세요.";
      }
    }
    return "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const { [name]: _discard, ...rest } = prev;
      return rest;
    });
    setStatus(null);
  };

  const validateForm = () => {
    const nextErrors = {};
    ["nickname", "phone"].forEach((field) => {
      const message = getFieldError(field, formData[field] || "");
      if (message) nextErrors[field] = message;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await updateProfile({
        nickname: formData.nickname.trim(),
        phone: formData.phone.trim(),
      });
      setStatus({
        type: "success",
        message: "회원 정보가 저장되었습니다. 홈으로 이동합니다.",
      });
      setTimeout(() => navigate("/home", { replace: true }), 1200);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-complete-page">
        <div className="profile-complete-card" role="status">
          정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-complete-page">
        <div className="profile-complete-card profile-complete-card--error">
          {status?.message || "회원 정보를 확인할 수 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-complete-page">
      <form className="profile-complete-card" onSubmit={handleSubmit}>
        <h1>추가 정보 입력</h1>
        <p className="profile-complete-desc">
          닉네임과 연락처만 입력하면 가입이 완료됩니다.
        </p>
        <div className="profile-complete-field">
          <label>이메일</label>
          <div className="profile-complete-readonly">{profile.email}</div>
        </div>
        <div className="profile-complete-field">
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={formData.nickname}
            onChange={handleChange}
            placeholder="닉네임을 입력해 주세요."
          />
          {errors.nickname && (
            <p className="profile-complete-error">{errors.nickname}</p>
          )}
        </div>
        <div className="profile-complete-field">
          <label htmlFor="phone">전화번호</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="010-1234-5678"
          />
          {errors.phone && (
            <p className="profile-complete-error">{errors.phone}</p>
          )}
        </div>
        {status && (
          <p
            className={`profile-complete-status profile-complete-status--${status.type}`}
          >
            {status.message}
          </p>
        )}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : "완료"}
        </button>
      </form>
    </div>
  );
}

export default ProfileCompletePage;
