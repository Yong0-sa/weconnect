import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundBlur from "../assets/backgroud_blur.png";
import {
  checkNicknameAvailability,
  fetchMyProfile,
  updateProfile,
} from "../api/profile";
import "./ProfilePage.css";

const INITIAL_PROFILE = {
  email: "grower@example.com",
  nickname: "초록지기",
  name: "김채소",
  phone: "010-1234-5678",
  memberType: "FARMER",
  farmName: "그린빌 농장",
  farmAddress: "전라남도 순천시 향매실로 123",
  bio: "지속 가능한 재배를 꿈꾸는 도시농부입니다.",
  marketingConsent: true,
  updatedAt: null,
};

const formatTimestamp = (value) => {
  if (!value) {
    return new Date().toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeProfile = (data = {}) => ({
  email: data.email ?? "",
  nickname: data.nickname ?? "",
  name: data.name ?? "",
  phone: data.phone ?? "",
  memberType:
    data.role === "FARMER"
      ? "FARMER"
      : data.role === "USER"
      ? "PERSONAL"
      : data.memberType ?? "PERSONAL",
  farmName: data.farmName ?? "",
  farmAddress: data.farmAddress ?? "",
  bio: data.bio ?? "",
  marketingConsent: Boolean(
    Object.prototype.hasOwnProperty.call(data, "marketingConsent")
      ? data.marketingConsent
      : INITIAL_PROFILE.marketingConsent
  ),
  updatedAt: data.updatedAt ?? null,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [savedProfile, setSavedProfile] = useState(INITIAL_PROFILE);
  const [formData, setFormData] = useState({
    nickname: INITIAL_PROFILE.nickname,
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("2024.05.12 10:22");
  const [nicknameCheck, setNicknameCheck] = useState({
    state: "idle",
    message: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalPassword, setModalPassword] = useState("");
  const [modalError, setModalError] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const trimmedNickname = (formData.nickname || "").trim();
  const memberTypeLabel = savedProfile.memberType || "PERSONAL";
  const isActionDisabled = isSaving || isLoadingProfile;

  const avatarInitials = useMemo(() => {
    const initials = (trimmedNickname || savedProfile.nickname).slice(0, 2);
    return initials || "MY";
  }, [trimmedNickname, savedProfile.nickname]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setIsLoadingProfile(true);
      try {
        const data = await fetchMyProfile();
        if (!active) return;
        const hydrated = normalizeProfile(data);
        setSavedProfile((prev) => ({
          ...prev,
          ...hydrated,
        }));
        setLastSavedAt(formatTimestamp(hydrated.updatedAt));
        setStatus(null);
      } catch (error) {
        if (!active) return;
        setStatus({
          type: "error",
          message: error.message || "회원 정보를 불러오지 못했습니다.",
        });
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      nickname: savedProfile.nickname || "",
    }));
  }, [savedProfile.nickname]);

  const getFieldError = (field, value, nextState = formData) => {
    const trimmed = value?.toString().trim() ?? "";
    switch (field) {
      case "nickname":
        if (!trimmed) return "닉네임을 입력해 주세요.";
        return "";
      case "password":
        if (!trimmed) return "";
        if (trimmed.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
        return "";
      case "confirmPassword":
        if (!nextState.password) return "";
        if (!trimmed) return "비밀번호를 다시 입력해 주세요.";
        if (trimmed !== nextState.password)
          return "비밀번호가 일치하지 않습니다.";
        return "";
      default:
        return "";
    }
  };

  const validateForm = () => {
    const fields = ["nickname"];
    if (formData.password) {
      fields.push("password", "confirmPassword");
    }

    const newErrors = {};
    fields.forEach((field) => {
      const message = getFieldError(field, formData[field]);
      if (message) newErrors[field] = message;
    });

    const nicknameChanged =
      trimmedNickname && trimmedNickname !== savedProfile.nickname;
    if (nicknameChanged && nicknameCheck.state !== "success") {
      newErrors.nickname = "닉네임 중복 확인을 완료해 주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextState = { ...prev, [name]: value };
      setErrors((prevErrors) => {
        const updated = { ...prevErrors };
        const message = getFieldError(name, value, nextState);
        if (message) {
          updated[name] = message;
        } else {
          delete updated[name];
        }
        if (name === "password") {
          const confirmMsg = getFieldError(
            "confirmPassword",
            nextState.confirmPassword,
            nextState
          );
          if (confirmMsg) {
            updated.confirmPassword = confirmMsg;
          } else {
            delete updated.confirmPassword;
          }
        }
        return updated;
      });
      return nextState;
    });

    if (name === "nickname") {
      setNicknameCheck({ state: "idle", message: "" });
    }
  };

  const handleCheckNickname = async () => {
    if (isLoadingProfile) return;
    const message = getFieldError("nickname", formData.nickname);
    if (message) {
      setErrors((prev) => ({ ...prev, nickname: message }));
      setNicknameCheck({ state: "idle", message: "" });
      return;
    }

    if (!trimmedNickname) return;

    setNicknameCheck({
      state: "checking",
      message: "닉네임을 확인하고 있어요.",
    });
    try {
      const result = await checkNicknameAvailability(trimmedNickname);
      const nicknameChanged =
        trimmedNickname && trimmedNickname !== savedProfile.nickname;
      if (result.available) {
        setNicknameCheck({
          state: nicknameChanged ? "success" : "info",
          message: nicknameChanged
            ? "사용 가능한 닉네임입니다."
            : "현재 사용 중인 닉네임입니다.",
        });
        setErrors((prev) => {
          const { nickname, ...rest } = prev;
          return rest;
        });
      } else {
        setNicknameCheck({
          state: "error",
          message: result.message || "이미 사용 중인 닉네임입니다.",
        });
        setErrors((prev) => ({
          ...prev,
          nickname: "다른 닉네임을 입력해 주세요.",
        }));
      }
    } catch (error) {
      setNicknameCheck({
        state: "error",
        message: error.message || "닉네임 중복 확인에 실패했습니다.",
      });
    }
  };

  const submitProfileUpdate = async (payload) => {
    setIsSaving(true);
    setStatus({ type: "info", message: "내 정보를 저장하고 있어요." });

    try {
      const updated = await updateProfile(payload);
      const hydrated = normalizeProfile(updated);
      setSavedProfile((prev) => ({ ...prev, ...hydrated }));
      setFormData({
        nickname: hydrated.nickname,
        password: "",
        confirmPassword: "",
      });
      setNicknameCheck({ state: "idle", message: "" });
      setErrors({});
      setLastSavedAt(formatTimestamp(hydrated.updatedAt));
      setStatus({ type: "success", message: "회원 정보가 저장되었어요." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "회원 정보를 저장하지 못했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoadingProfile || !validateForm()) return;

    const payload = {
      nickname: trimmedNickname || savedProfile.nickname,
      newPassword: formData.password || undefined,
    };

    if (formData.password) {
      setPendingPayload(payload);
      setModalPassword("");
      setModalError("");
      setShowPasswordModal(true);
      return;
    }

    await submitProfileUpdate(payload);
  };

  const handleModalConfirm = async () => {
    if (!modalPassword.trim()) {
      setModalError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    setShowPasswordModal(false);
    await submitProfileUpdate({
      ...(pendingPayload || {}),
      currentPassword: modalPassword.trim(),
    });
    setPendingPayload(null);
    setModalPassword("");
    setModalError("");
  };

  const handleModalClose = () => {
    if (isSaving) return;
    setShowPasswordModal(false);
    setPendingPayload(null);
    setModalPassword("");
    setModalError("");
  };

  const handleCancelClick = () => {
    if (isActionDisabled) return;
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelModal(false);
    navigate("/home");
  };

  const handleCancelModalClose = () => {
    if (isSaving) return;
    setShowCancelModal(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-bg" aria-hidden="true">
        <img src={BackgroundBlur} alt="blurred background" />
      </div>

      <div className="profile-wrapper">
        <section className="profile-hero">
          <div className="hero-avatar" aria-hidden="true">
            {avatarInitials}
          </div>
          <div className="hero-meta">
            <p className="hero-label">마이페이지</p>
            <h1>{savedProfile.name}님</h1>
            <p className="hero-email">{savedProfile.email}</p>
            <div className="hero-tags">
              <span
                className={`hero-badge hero-badge--${memberTypeLabel.toLowerCase()}`}
              >
                {memberTypeLabel === "FARMER" ? "농장주 회원" : "일반 회원"}
              </span>
              <span className="hero-badge hero-badge--soft">
                최근 저장 • {lastSavedAt}
              </span>
            </div>
          </div>
        </section>

        <form
          id="profile-form"
          className="profile-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {status && (
            <div className={`profile-toast profile-toast--${status.type}`}>
              <span>{status.message}</span>
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => setStatus(null)}
              >
                ×
              </button>
            </div>
          )}
          {isLoadingProfile && (
            <p className="profile-loading" role="status">
              회원 정보를 불러오는 중입니다...
            </p>
          )}

          <section className="form-section form-section--readonly">
            <div className="section-heading">
              <h2>회원 정보</h2>
              <p>기존 가입 정보는 확인만 가능합니다.</p>
            </div>
            <label className="profile-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              className="profile-input profile-input--readonly"
              type="email"
              value={savedProfile.email}
              readOnly
              disabled
            />

            <label className="profile-label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className="profile-input profile-input--readonly"
              type="text"
              value={savedProfile.name}
              readOnly
              disabled
            />

            <label className="profile-label" htmlFor="phone">
              전화번호
            </label>
            <input
              id="phone"
              className="profile-input profile-input--readonly"
              type="tel"
              value={savedProfile.phone}
              readOnly
              disabled
            />

            <label className="profile-label" htmlFor="bio">
              한 줄 소개
            </label>
            <textarea
              id="bio"
              className="profile-textarea profile-input--readonly"
              value={savedProfile.bio}
              readOnly
              disabled
              rows={3}
            />

            {memberTypeLabel === "FARMER" && (
              <>
                <label className="profile-label" htmlFor="farmName">
                  농장 이름
                </label>
                <input
                  id="farmName"
                  className="profile-input profile-input--readonly"
                  type="text"
                  value={savedProfile.farmName}
                  readOnly
                  disabled
                />

                <label className="profile-label" htmlFor="farmAddress">
                  농장 주소
                </label>
                <input
                  id="farmAddress"
                  className="profile-input profile-input--readonly"
                  type="text"
                  value={savedProfile.farmAddress}
                  readOnly
                  disabled
                />
              </>
            )}

            <div className="readonly-pill">
              알림 수신 상태:{" "}
              <strong>{savedProfile.marketingConsent ? "동의" : "거부"}</strong>
            </div>
          </section>

          <section className="form-section">
            <h2>닉네임 수정</h2>
            <label className="profile-label" htmlFor="nickname">
              닉네임
            </label>
            <div className="nickname-inline">
              <input
                id="nickname"
                className="profile-input"
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="닉네임을 입력해 주세요."
                disabled={isLoadingProfile}
              />
              <button
                type="button"
                className="profile-check-btn"
                onClick={handleCheckNickname}
                disabled={
                  nicknameCheck.state === "checking" || isLoadingProfile
                }
              >
                {nicknameCheck.state === "checking"
                  ? "확인 중..."
                  : "중복 확인"}
              </button>
            </div>
            {errors.nickname && (
              <p className="input-error">{errors.nickname}</p>
            )}
            {nicknameCheck.message && (
              <p
                className={`nickname-status nickname-status--${nicknameCheck.state}`}
              >
                {nicknameCheck.message}
              </p>
            )}
          </section>

          <section className="form-section">
            <h2>비밀번호 변경</h2>
            <label className="profile-label" htmlFor="password">
              새 비밀번호
            </label>
            <input
              id="password"
              className="profile-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="변경할 비밀번호를 입력해 주세요."
              disabled={isActionDisabled}
            />
            {errors.password && (
              <p className="input-error">{errors.password}</p>
            )}

            <label className="profile-label" htmlFor="confirmPassword">
              새 비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              className="profile-input"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력해 주세요."
              disabled={isActionDisabled}
            />
            {errors.confirmPassword && (
              <p className="input-error">{errors.confirmPassword}</p>
            )}
          </section>

          <div className="form-actions">
            <button
              type="button"
              className="outline-btn"
              onClick={handleCancelClick}
              disabled={isActionDisabled}
            >
              변경 취소
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isActionDisabled}
            >
              {isSaving ? "저장 중..." : "변경 사항 저장"}
            </button>
          </div>
        </form>
      </div>
      {showPasswordModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <div className="password-modal__header">비밀번호 확인</div>
            <p className="password-modal__desc">
              현재 비밀번호를 입력해 주세요. 로그인 창과 동일한 스타일로
              보호됩니다.
            </p>
            <label className="profile-label" htmlFor="current-password-input">
              현재 비밀번호
            </label>
            <div className="password-field">
              <input
                id="current-password-input"
                type="password"
                value={modalPassword}
                onChange={(e) => {
                  setModalPassword(e.target.value);
                  setModalError("");
                }}
                placeholder="현재 비밀번호"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleModalConfirm();
                  }
                }}
              />
            </div>
            {modalError && (
              <p className="password-modal__error">{modalError}</p>
            )}
            <div className="password-modal__actions">
              <button
                type="button"
                className="outline-btn"
                onClick={handleModalClose}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleModalConfirm}
                disabled={isSaving}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <div className="password-modal__header">변경을 취소할까요?</div>
            <p className="password-modal__desc">
              취소를 누르면 메인 페이지로 이동해요. 계속 진행할까요?
            </p>
            <div className="password-modal__actions">
              <button
                type="button"
                className="outline-btn"
                onClick={handleCancelModalClose}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleCancelConfirm}
                disabled={isSaving}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
