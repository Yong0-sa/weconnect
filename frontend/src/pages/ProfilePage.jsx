import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkNicknameAvailability,
  fetchMyProfile,
  updateProfile,
  deleteAccount,
} from "../api/profile";
import "./ProfilePage.css";

// 📌 UI에 들어가는 유틸/기본값
const PHONE_PLACEHOLDERS = ["010-0000-0000", "010-1234-1234"];
const sanitizePhoneValue = (value) => {
  if (!value) return "";
  return PHONE_PLACEHOLDERS.includes(value) ? "" : value;
};

const LOGIN_REDIRECT_URL =
  import.meta.env.VITE_LOGIN_REDIRECT_URL || "/login";

// 더미 초기값 (로딩 전까지 표시)
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

// 날짜 포맷
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

// 서버 응답 → 화면용 프로필 형태로 맞춤
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

// ------------------------------------------------------------
// 📌 프로필 메인 컴포넌트
// ------------------------------------------------------------
function ProfilePage({ isOpen, onClose = () => {} }) {
  const navigate = useNavigate();

  // ⭐ 서버에 저장된 값 / 현재 입력값
  const [savedProfile, setSavedProfile] = useState(INITIAL_PROFILE);
  const [formData, setFormData] = useState({
    name: INITIAL_PROFILE.name,
    nickname: INITIAL_PROFILE.nickname,
    phone: sanitizePhoneValue(INITIAL_PROFILE.phone),
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ⭐ UI / 검증 상태들
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("2024.05.12 10:22");
  const [nicknameCheck, setNicknameCheck] = useState({
    state: "idle",
    message: "",
  });

  // ⭐ 탈퇴 관련 UI state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] =
    useState(false);
  const [showFarewellModal, setShowFarewellModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [farewellError, setFarewellError] = useState("");

  const trimmedNickname = (formData.nickname || "").trim();
  const memberTypeLabel = savedProfile.memberType || "PERSONAL";
  const isFormDisabled = isSaving || isLoadingProfile;

  // 📌 모달 닫기
  const handleCloseModal = () => {
    if (isSaving) return;
    setShowWithdrawConfirmModal(false);
    setShowFarewellModal(false);
    onClose();
  };

  // 클릭 시 오버레이 닫기
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleCloseModal();
    }
  };

  // 📌 프로필 불러오기 (모달 open 시)
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // 📌 서버에서 받은 프로필 → form 입력값 초기화
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: savedProfile.name || "",
      nickname: savedProfile.nickname || "",
      phone: sanitizePhoneValue(savedProfile.phone),
    }));
  }, [savedProfile.name, savedProfile.nickname, savedProfile.phone]);

  // 📌 입력 필드 검증
  const getFieldError = (field, value, nextState = formData) => {
    const trimmed = value?.toString().trim() ?? "";

    switch (field) {
      case "nickname":
        if (!trimmed) return "닉네임을 입력해 주세요.";
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

  // 📌 전체 form 검증
  const validateForm = () => {
    const fields = ["name", "nickname", "phone"];
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

  // 📌 서버 전송용 payload 생성
  const buildProfilePayload = () => {
    const payload = {};

    if (trimmedNickname) {
      const savedNickname = (savedProfile.nickname || "").trim();
      if (trimmedNickname !== savedNickname) {
        payload.nickname = trimmedNickname;
      }
    }

    const trimmedName = (formData.name || "").trim();
    if (trimmedName && trimmedName !== (savedProfile.name || "").trim()) {
      payload.name = trimmedName;
    }

    const trimmedPhone = (formData.phone || "").trim();
    if (trimmedPhone && trimmedPhone !== (savedProfile.phone || "").trim()) {
      payload.phone = trimmedPhone;
    }

    if (formData.newPassword) {
      payload.newPassword = formData.newPassword.trim();
      payload.currentPassword = formData.currentPassword?.trim();
    }

    return payload;
  };

  // 📌 입력 변화 처리
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const nextState = { ...prev, [name]: value };

      // 해당 필드 즉시 검증
      setErrors((prevErrors) => {
        const updated = { ...prevErrors };
        const message = getFieldError(name, value, nextState);
        if (message) {
          updated[name] = message;
        } else {
          delete updated[name];
        }

        // 비밀번호 관련 상호 검증
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

        if (name === "currentPassword" && nextState.newPassword) {
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
        }

        if (name === "confirmPassword" && nextState.newPassword) {
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

    // 닉네임 바뀌면 중복확인 초기화
    if (name === "nickname") {
      setNicknameCheck({ state: "idle", message: "" });
    }
  };

  // 📌 닉네임 중복 확인
  const handleCheckNickname = async () => {
    if (isLoadingProfile || isSaving) return;

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

  // 📌 서버로 업데이트 요청
  const submitProfileUpdate = async (payload) => {
    setIsSaving(true);
    setStatus({ type: "info", message: "내 정보를 저장하고 있어요." });

    try {
      const updated = await updateProfile(payload);
      const hydrated = normalizeProfile(updated);

      setSavedProfile((prev) => ({ ...prev, ...hydrated }));
      setFormData({
        name: hydrated.name,
        nickname: hydrated.nickname,
        phone: sanitizePhoneValue(hydrated.phone),
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

  // 📌 최종 제출 버튼 클릭
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoadingProfile) {
      setStatus({
        type: "error",
        message: "프로필을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.",
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

  // 📌 탈퇴 플로우: 1단계 → 2단계 확인 → 최종 삭제
  const handleWithdrawClick = () => {
    if (isDeletingAccount) return;
    setShowWithdrawConfirmModal(true);
  };

  const handleWithdrawConfirm = () => {
    setShowWithdrawConfirmModal(false);
    setShowFarewellModal(true);
  };

  const handleWithdrawConfirmCancel = () => {
    setShowWithdrawConfirmModal(false);
  };

  const handleFarewellAction = async () => {
    if (isDeletingAccount) return;

    setFarewellError("");
    setIsDeletingAccount(true);

    try {
      await deleteAccount();
      setShowFarewellModal(false);

      // 절대 URL이면 replace()
      if (/^https?:\/\//i.test(LOGIN_REDIRECT_URL)) {
        window.location.replace(LOGIN_REDIRECT_URL);
      } else {
        const nextPath = LOGIN_REDIRECT_URL.startsWith("/")
          ? LOGIN_REDIRECT_URL
          : `/${LOGIN_REDIRECT_URL}`;
        navigate(nextPath, { replace: true });
      }
    } catch (error) {
      setFarewellError(error.message || "탈퇴 처리에 실패했습니다.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // 📌 모달이 아예 닫혀있으면 렌더 X
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="profile-modal-overlay"
        role="dialog"
        aria-modal="true"
        onClick={handleOverlayClick}
      >
        <div className="profile-card">
          <button
            type="button"
            className="profile-modal__close"
            aria-label="회원정보 수정 닫기"
            onClick={handleCloseModal}
          >
            ×
          </button>
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
            <button
              type="button"
              className="withdraw-btn"
              onClick={handleWithdrawClick}
              disabled={isDeletingAccount}
              title={`최근 저장 ${lastSavedAt}`}
            >
              회원 탈퇴
            </button>
          </div>
        </header>
        <div className="profile-card__scroll">
          <form id="profile-form" className="profile-form-table" onSubmit={handleSubmit} noValidate>
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
                  <div className="profile-row__value profile-row__value--input">
                    <input
                      id="name"
                      className="profile-input"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="이름을 입력해 주세요."
                      disabled={isFormDisabled}
                    />
                  </div>
                  {errors.name && <p className="input-error">{errors.name}</p>}
                </div>
              </div>

              <div className="profile-row">
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
                        isSaving
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

              <div className="profile-row">
                <div className="profile-row__label">휴대폰 번호</div>
                <div className="profile-row__content">
                  <div className="profile-row__value profile-row__value--input">
                    <input
                      id="phone"
                      className="profile-input"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="010-1234-5678"
                      disabled={isFormDisabled}
                    />
                  </div>
                  {errors.phone && <p className="input-error">{errors.phone}</p>}
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
                  <p className="profile-row__hint">
                    새 비밀번호를 입력하지 않으면 비밀번호는 변경되지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="form-actions">
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
      </div>
    </div>

      {showWithdrawConfirmModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <div className="password-modal__header">정말 탈퇴하시겠어요?</div>
            <p className="password-modal__desc">
              탈퇴하면 저장된 모든 데이터가 완전히 삭제돼요.
            </p>
            <div className="password-modal__actions">
              <button
                type="button"
                className="outline-btn"
                onClick={handleWithdrawConfirmCancel}
              >
                취소
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleWithdrawConfirm}
              >
                계속 탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
      {showFarewellModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <div className="password-modal__header">탈퇴 전 마지막 확인</div>
            <p className="password-modal__desc">
              탈퇴하면 모든 이용 기록과 저장된 데이터가 즉시 삭제되며 복구할
              수 없어요. 정말 탈퇴하시겠어요?
            </p>
            {farewellError && (
              <p className="password-modal__error">{farewellError}</p>
            )}
            <div className="password-modal__actions">
              <button
                type="button"
                className="outline-btn"
                onClick={() => setShowFarewellModal(false)}
                disabled={isDeletingAccount}
              >
                아니오
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleFarewellAction}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "탈퇴 처리 중..." : "네, 탈퇴할게요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfilePage;
