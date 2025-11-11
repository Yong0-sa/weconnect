import { useEffect, useRef, useState } from "react";
import "./AICropSearchPage.css";

const cropOptions = ["토마토", "감자", "파프리카"];

function AICropSearchPage({ onClose }) {
  const [selectedCrop, setSelectedCrop] = useState(cropOptions[0]);
  const [showReport, setShowReport] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const handleDiagnose = () => {
    if (!photoPreview) return;
    setShowReport(true);
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    if (files.length > 1) {
      setUploadError("사진은 한 장만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }
    setUploadError("");
    const file = files[0];
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return previewUrl;
    });
    setShowReport(false);
    event.target.value = "";
  };

  const handleUploadClick = () => {
    setShowReport(false);
    setUploadError("");
    setPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  return (
    <div className="ai-crop-page">
      <div className="ai-crop-card">
        {onClose && (
          <button
            type="button"
            className="ai-close-btn"
            onClick={onClose}
            aria-label="작물 진단 창 닫기"
          >
            ×
          </button>
        )}
        <div className="ai-crop-card-body">
          <div className="ai-crop-left">
            <input
              type="file"
              id="crop-upload"
              accept="image/*"
              ref={fileInputRef}
              className="hidden-file-input"
              onChange={handleFileChange}
            />
            {photoPreview ? (
              <div
                className="image-preview"
                role="img"
                aria-label="업로드한 작물 사진"
              >
                <img src={photoPreview} alt="업로드한 작물 사진 미리보기" />
                <button
                  type="button"
                  className="change-photo-btn"
                  onClick={handleUploadClick}
                >
                  다른 사진 선택
                </button>
              </div>
            ) : (
              <label className="upload-label" htmlFor="crop-upload">
                <span>작물 사진 업로드</span>
                <p>이미지를 선택하거나 드래그하세요</p>
              </label>
            )}
            {uploadError && <p className="upload-error">{uploadError}</p>}
          </div>
          <div className="ai-crop-right">
            {showReport ? (
              <div className="diagnosis-report">
                <h3>AI 진단 보고서</h3>
                <div className="report-meta">
                  <span className="report-chip">{selectedCrop}</span>
                  <button type="button" className="diary-share-btn">
                    재배 일기로 공유하기
                  </button>
                </div>
                <div className="report-scroll-area">
                  <p className="report-placeholder">
                    LLM에서 생성된 진단 내용을 이 영역에 렌더링하세요. 긴 텍스트가
                    들어와도 스크롤로 확인할 수 있도록 여유 공간을 확보했습니다.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="crop-select-box">
                  <span>작물 선택</span>
                  <div
                    className="crop-button-list"
                    role="group"
                    aria-label="작물 선택"
                  >
                    {cropOptions.map((crop) => (
                      <button
                        type="button"
                        key={crop}
                        className={`crop-btn${
                          selectedCrop === crop ? " selected" : ""
                        }`}
                        onClick={() => setSelectedCrop(crop)}
                        aria-pressed={selectedCrop === crop}
                      >
                        {crop}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="diagnose-actions">
                  <button
                    type="button"
                    className="history-btn"
                    onClick={() => {
                      /* TODO: hook up to diagnosis history view */
                    }}
                  >
                    진단 목록
                  </button>
                  <button
                    type="button"
                    className="diagnose-btn"
                    onClick={handleDiagnose}
                    disabled={!photoPreview}
                  >
                    진단하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICropSearchPage;
