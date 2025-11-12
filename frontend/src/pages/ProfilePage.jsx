import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkNicknameAvailability,
  fetchMyProfile,
  updateProfile,
  deleteAccount,
} from "../api/profile";
import "./ProfilePage.css";

const PHONE_PLACEHOLDERS = ["010-0000-0000", "010-1234-1234"];
const sanitizePhoneValue = (value) => {
  if (!value) return "";
  return PHONE_PLACEHOLDERS.includes(value) ? "" : value;
};

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
    phone: sanitizePhoneValue(INITIAL_PROFILE.phone),
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
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] =
    useState(false);
  const [showFarewellModal, setShowFarewellModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [farewellError, setFarewellError] = useState("");

  const trimmedNickname = (formData.nickname || "").trim();
  const memberTypeLabel = savedProfile.memberType || "PERSONAL";
  const isFormDisabled = isSaving || isLoadingProfile;

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
      phone: sanitizePhoneValue(savedProfile.phone),
    }));
  }, [savedProfile.nickname, savedProfile.phone]);

  const getFieldError = (field, value, nextState = formData) => {
    const trimmed = value?.toString().trim() ?? "";
    switch (field) {
      case "nickname":
        if (!trimmed) return "닉네임을 입력해 주세요.";
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

  const validateForm = () => {
    const fields = ["nickname", "phone"];

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

    const trimmedPhone = (formData.phone || "").trim();
    if (trimmedPhone && trimmedPhone !== (savedProfile.phone || "").trim()) {
      payload.phone = trimmedPhone;
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
        return updated;
      });
      return nextState;
    });

    if (name === "nickname") {
      setNicknameCheck({ state: "idle", message: "" });
    }
  };

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

  const submitProfileUpdate = async (payload) => {
    setIsSaving(true);
    setStatus({ type: "info", message: "내 정보를 저장하고 있어요." });

    try {
      const updated = await updateProfile(payload);
      const hydrated = normalizeProfile(updated);
      setSavedProfile((prev) => ({ ...prev, ...hydrated }));
      setFormData({
        nickname: hydrated.nickname,
        phone: sanitizePhoneValue(hydrated.phone),
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
      navigate("/login", { replace: true });
    } catch (error) {
      setFarewellError(error.message || "탈퇴 처리에 실패했습니다.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
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
                {errors.phone && (
                  <p className="input-error">{errors.phone}</p>
                )}
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
    </div>
  );
}

export default ProfilePage;
