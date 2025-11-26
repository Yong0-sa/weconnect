import { useEffect, useState } from "react";
import "./FarmApplyPromptModal.css";

function FarmApplyPromptModal({
  onApply = () => {},
  onLater = () => {},
  disabled = false,
}) {
  const [scale, setScale] = useState(1);

  // 모달 크기 자동 조정 (무한축소)
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateScale = () => {
      const baseWidth = 1920;
      const baseHeight = 919;
      const widthScale = window.innerWidth / baseWidth;
      const heightScale = window.innerHeight / baseHeight;
      const nextScale = Math.min(widthScale, heightScale);
      setScale(nextScale > 0 ? nextScale : 0.5);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div className="farm-apply-modal" role="dialog" aria-modal="true">
      <div className="farm-apply-card" style={{ transform: `scale(${scale})` }}>
        <header className="farm-apply-header">
          <div>
            <p className="farm-apply-eyebrow">농장 이용 안내</p>
            <h2>농장 이용 신청을 하시겠어요?</h2>
          </div>
        </header>
        <p className="farm-apply-body">
          농장주에게 승인을 요청하면 농장 서비스를 이용할 수 있어요. 신청하시면
          농장 찾기 페이지로 이동합니다.
        </p>
        <div className="farm-apply-actions">
          <button
            type="button"
            className="farm-apply-secondary"
            onClick={onLater}
            disabled={disabled}
          >
            나중에 할래요
          </button>
          <button
            type="button"
            className="farm-apply-primary"
            onClick={onApply}
            disabled={disabled}
          >
            신청하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default FarmApplyPromptModal;
