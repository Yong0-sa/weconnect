import "./DiaryModal.css";

function DiaryModal({ onClose }) {
  return (
    <div className="diary-modal-card">
      {onClose && (
        <button
          type="button"
          className="diary-modal-close"
          onClick={onClose}
          aria-label="재배 일기 창 닫기"
        >
          ×
        </button>
      )}
      <header className="diary-modal-header">
        <p className="diary-eyebrow">GROWTH LOG</p>
        <h2>재배 일기</h2>
        <p>작물별 성장 기록과 사진, 메모를 곧 여기에서 확인할 수 있어요.</p>
      </header>
      <section className="diary-modal-body">
        <div className="diary-placeholder">
          <span>재배 일기 기능을 준비 중입니다.</span>
        </div>
      </section>
    </div>
  );
}

export default DiaryModal;
