import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkNicknameAvailability,
  fetchMyProfile,
  updateProfile,
  verifyCurrentPassword,
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
    currentPassword: "",
    newPassword: "",
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isEntryVerified, setIsEntryVerified] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(true);
  const [entryPassword, setEntryPassword] = useState("");
  const [entryError, setEntryError] = useState("");
  const [isVerifyingEntry, setIsVerifyingEntry] = useState(false);

  const trimmedNickname = (formData.nickname || "").trim();
  const memberTypeLabel = savedProfile.memberType || "PERSONAL";
  const isLocked = !isEntryVerified;
  const isFormDisabled = isSaving || isLoadingProfile || isLocked;

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
      case "currentPassword":
        if (!nextState.newPassword) return "";
        if (!trimmed) return "현재 비밀번호를 입력해 주세요.";
        return "";
      case "newPassword":
        if (!trimmed) return "";
        if (trimmed.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
        if (
          nextState.currentPassword &&
          trimmed === nextState.currentPassword.trim()
        ) {
          return "현재 비밀번호와 다른 비밀번호를 입력해 주세요.";
        }
        return "";
      case "confirmPassword":
        if (!nextState.newPassword) return "";
        if (!trimmed) return "비밀번호를 다시 입력해 주세요.";
        if (trimmed !== nextState.newPassword)
          return "비밀번호가 일치하지 않습니다.";
        return "";
      default:
        return "";
    }
  };

  const validateForm = () => {
    const fields = ["nickname"];
    if (formData.newPassword) {
      fields.push("currentPassword", "newPassword", "confirmPassword");
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

  const buildProfilePayload = () => {
    const payload = {};

    if (trimmedNickname) {
      const savedNickname = (savedProfile.nickname || "").trim();
      if (trimmedNickname !== savedNickname) {
        payload.nickname = trimmedNickname;
      }
    }

    if (formData.newPassword) {
      payload.newPassword = formData.newPassword.trim();
      payload.currentPassword = formData.currentPassword?.trim();
    }

    return payload;
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
        if (name === "newPassword") {
          const currentMsg = getFieldError(
            "currentPassword",
            nextState.currentPassword,
            nextState
          );
          if (currentMsg) {
            updated.currentPassword = currentMsg;
          } else {
            delete updated.currentPassword;
          }
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
    if (isLoadingProfile || isLocked) return;
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
        currentPassword: "",
        newPassword: "",
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
    if (isLoadingProfile || isLocked) {
      setStatus({
        type: "error",
        message: "회원정보 보호를 위해 비밀번호를 먼저 확인해 주세요.",
      });
      return;
    }
    if (!validateForm()) return;

    const payload = buildProfilePayload();
    if (Object.keys(payload).length === 0) {
      setStatus({
        type: "info",
        message: "변경된 내용이 없습니다.",
      });
      return;
    }

    await submitProfileUpdate(payload);
  };

  const handleCancelClick = () => {
    if (isSaving) return;
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

  const handleEntryVerify = async () => {
    if (!entryPassword.trim()) {
      setEntryError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    setEntryError("");
    setIsVerifyingEntry(true);
    try {
      await verifyCurrentPassword(entryPassword.trim());
      setIsEntryVerified(true);
      setShowEntryModal(false);
      setEntryPassword("");
    } catch (error) {
      setEntryError(error.message || "비밀번호가 일치하지 않습니다.");
    } finally {
      setIsVerifyingEntry(false);
    }
  };

  const handleEntryCancel = () => {
    if (isVerifyingEntry) return;
    navigate("/home");
  };

  return (
    <div className="profile-page">
      <div className={`profile-card ${isLocked ? "profile-card--locked" : ""}`}>
        <header className="profile-card__header">
          <div>
            <p className="profile-card__eyebrow">회원정보 수정</p>
            <h1 className="profile-card__title">
              {savedProfile.name || "회원"}님의 계정
            </h1>
          </div>
          <div className="profile-card__meta">
            <span>
              {memberTypeLabel === "FARMER" ? "농장주 회원" : "일반 회원"}
            </span>
            <span>최근 저장 {lastSavedAt}</span>
          </div>
        </header>

        {!isEntryVerified && (
          <div className="profile-locked-banner">
            회원님의 정보를 보호하기 위해 비밀번호 확인 전까지 수정이 잠겨
            있어요.
          </div>
        )}

        <form
          id="profile-form"
          className="profile-form-table"
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

          <div className="profile-info-table" aria-live="polite">
            <div className="profile-row">
              <div className="profile-row__label">아이디(이메일)</div>
              <div className="profile-row__content">
                <div className="profile-row__value">{savedProfile.email}</div>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-row__label">이름</div>
              <div className="profile-row__content">
                <div className="profile-row__value">{savedProfile.name}</div>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-row__label">휴대폰 번호</div>
              <div className="profile-row__content">
                <div className="profile-row__value">{savedProfile.phone}</div>
              </div>
            </div>

            <div className="profile-row profile-row--nickname">
              <div className="profile-row__label">닉네임</div>
              <div className="profile-row__content">
                <div className="profile-row__value profile-row__value--input">
                  <input
                    id="nickname"
                    className="profile-input"
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    placeholder="닉네임을 입력해 주세요."
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    className="profile-check-btn"
                    onClick={handleCheckNickname}
                    disabled={
                      nicknameCheck.state === "checking" ||
                      isLoadingProfile ||
                      isLocked
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
              </div>
            </div>

            <div className="profile-row profile-row--stacked">
              <div className="profile-row__label">비밀번호 변경</div>
              <div className="profile-row__content">
                <div className="profile-row__content--grid">
                  <div className="password-field-group">
                    <label htmlFor="currentPassword">현재 비밀번호</label>
                    <input
                      id="currentPassword"
                      className="profile-input"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="현재 비밀번호"
                      disabled={isFormDisabled}
                    />
                    {errors.currentPassword && (
                      <p className="input-error">{errors.currentPassword}</p>
                    )}
                  </div>
                  <div className="password-field-group">
                    <label htmlFor="newPassword">새 비밀번호</label>
                    <input
                      id="newPassword"
                      className="profile-input"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="8자 이상 입력해 주세요."
                      disabled={isFormDisabled}
                    />
                    {errors.newPassword && (
                      <p className="input-error">{errors.newPassword}</p>
                    )}
                  </div>
                  <div className="password-field-group">
                    <label htmlFor="confirmPassword">비밀번호 다시 입력</label>
                    <input
                      id="confirmPassword"
                      className="profile-input"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="비밀번호를 확인해 주세요."
                      disabled={isFormDisabled}
                    />
                    {errors.confirmPassword && (
                      <p className="input-error">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="outline-btn"
              onClick={handleCancelClick}
              disabled={isSaving}
            >
              변경 취소
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isFormDisabled}
            >
              {isSaving ? "저장 중..." : "변경 사항 저장"}
            </button>
          </div>
        </form>
      </div>
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
      {showEntryModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <div className="password-modal__header">비밀번호 확인</div>
            <p className="password-modal__desc">
              회원정보를 수정하기 전에 현재 비밀번호를 다시 입력해 주세요.
            </p>
            <label className="profile-label" htmlFor="entry-password">
              현재 비밀번호
            </label>
            <div className="password-field">
              <input
                id="entry-password"
                type="password"
                value={entryPassword}
                onChange={(e) => {
                  setEntryPassword(e.target.value);
                  setEntryError("");
                }}
                placeholder="현재 비밀번호"
                autoFocus
                disabled={isVerifyingEntry}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEntryVerify();
                  }
                }}
              />
            </div>
            {entryError && (
              <p className="password-modal__error">{entryError}</p>
            )}
            <div className="password-modal__actions">
              <button
                type="button"
                className="outline-btn"
                onClick={handleEntryCancel}
                disabled={isVerifyingEntry}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleEntryVerify}
                disabled={isVerifyingEntry}
              >
                {isVerifyingEntry ? "확인 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
