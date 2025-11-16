import { useState } from "react";
import { registerFarm } from "../api/farm";
import "./FarmRegisterModal.css";

// 기본 입력값
const INITIAL_FORM = {
  name: "",
  address: "",
  tel: "",
};

function FarmRegisterModal({ onClose = () => {}, onRegistered = () => {} }) {
  // ------------------------------------------------------------
  // 📌 상태 관리: 폼 입력값 / 오류 / 제출 상태 / 알림 메시지
  // ------------------------------------------------------------
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📌 필드 단위 유효성 검사
  const getFieldError = (field, value) => {
    const trimmed = value.trim();

    // 필수값 검사
    if (!trimmed) {
      if (field === "name") return "농장 이름을 입력해 주세요.";
      if (field === "address") return "농장 주소를 입력해 주세요.";
    }

    // 전화번호 형식 검사 (입력한 경우에만)
    if (field === "tel" && trimmed) {
      if (!/^\d{2,4}-?\d{3,4}-?\d{4}$/.test(trimmed)) {
        return "전화번호는 01012345678 또는 010-1234-5678 형식으로 입력해 주세요.";
      }
    }
    return "";
  };

  // ------------------------------------------------------------
  // 📌 전체 폼 유효성 검사
  //   - 필드 오류 모아서 errors에 저장
  //   - 모든 필드 통과 시 true
  // ------------------------------------------------------------
  const validateForm = () => {
    const nextErrors = {};
    ["name", "address", "tel"].forEach((field) => {
      const message = getFieldError(field, formData[field]);
      if (message) {
        nextErrors[field] = message;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };


  // 📌 입력 변화 시 상태 업데이트 + 오류 자동 갱신
  const handleChange = (event) => {
    const { name, value } = event.target;

    // 폼 값 업데이트
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 기존 오류가 있다면 즉시 재검증
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        const message = getFieldError(name, value);
        if (message) next[name] = message;
        else delete next[name];
        return next;
      });
    }
  };


  // ------------------------------------------------------------
  // 📌 제출 처리
  //   - 유효성 검사 통과 → registerFarm API 호출
  //   - 성공 시: 메시지 표시 + 상위 컴포넌트에 알림 + 닫기
  // ------------------------------------------------------------
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        tel: formData.tel.trim(),
      };

      const farm = await registerFarm(payload);

      setStatus({ type: "success", message: "농장 정보가 등록되었습니다." });
      onRegistered(farm);  // 부모에게 등록 완료 전달
      onClose();           // 모달 닫기
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "농장 정보를 저장하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="farm-register-modal" role="dialog" aria-modal="true">
      <div className="farm-register-card">
        <header className="farm-register-header">
          <div>
            <p className="farm-register-eyebrow">농장 정보 등록</p>
            <h2>농장주 정보를 완성해 주세요</h2>
          </div>
          <button
            type="button"
            className="farm-register-close"
            aria-label="농장 등록 닫기"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </header>

        {status && (
          <div className={`farm-register-toast farm-register-toast--${status.type}`}>
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

        <form className="farm-register-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="farm-name">농장 이름</label>
          <input
            id="farm-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="예) 위커넥트 스마트팜"
            disabled={isSubmitting}
          />
          {errors.name && <p className="input-error">{errors.name}</p>}

          <label htmlFor="farm-address">농장 주소</label>
          <textarea
            id="farm-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="도로명 주소를 입력해 주세요."
            disabled={isSubmitting}
            rows={3}
          />
          {errors.address && <p className="input-error">{errors.address}</p>}

          <label htmlFor="farm-tel">농장 전화번호</label>
          <input
            id="farm-tel"
            name="tel"
            type="tel"
            value={formData.tel}
            onChange={handleChange}
            placeholder="010-1234-5678"
            disabled={isSubmitting}
          />
          {errors.tel && <p className="input-error">{errors.tel}</p>}

          <div className="farm-register-actions">
            <button
              type="button"
              className="farm-register-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              나중에 할게요
            </button>
            <button type="submit" className="farm-register-primary" disabled={isSubmitting}>
              {isSubmitting ? "등록 중..." : "농장 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FarmRegisterModal;
