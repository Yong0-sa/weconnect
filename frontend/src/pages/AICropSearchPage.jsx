import { useEffect, useRef, useState } from "react";
import { diagnoseCrop, fetchDiagnosisHistory } from "../api/ai";
import "./AICropSearchPage.css";

// 작물 선택 옵션
const cropOptions = [
  { value: "apple", label: "사과" },
  { value: "tomato", label: "토마토" },
  { value: "grape", label: "포도"},
];

function AICropSearchPage({ onClose, onOpenDiaryModal }) {
    // 상태 정의
  const [selectedCrop, setSelectedCrop] = useState(cropOptions[0]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [currentView, setCurrentView] = useState("main"); // "main" | "history" | "detail"
  const fileInputRef = useRef(null);

  // 서버에서 진단 내역 불러오기
  const loadDiagnosisHistory = async () => {
    try {
      const history = await fetchDiagnosisHistory();
      setDiagnosisHistory(history);
    } catch (error) {
      console.error("진단 내역 조회 실패:", error);
      // 에러 시 빈 배열 유지
    }
  };

  useEffect(() => {
    loadDiagnosisHistory();
  }, []);

  // 미리보기 URL 해제 (메모리 누수 방지)
  const cleanupPreview = (previewUrl) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // 파일 선택 핸들러 - 한 장만 허용 - 미리보기 갱신
  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files?.length) return;

    if (files.length > 1) {
      setUploadError("사진은 한 장만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setUploadError("");
    setRequestError("");

    const file = files[0];
    const previewUrl = URL.createObjectURL(file);

    setPhotoPreview((prev) => {
      cleanupPreview(prev);
      return previewUrl;
    });
    setSelectedFile(file);
    setDiagnosis(null);
    event.target.value = "";
  };

  // "다른 사진 선택" 버튼
  // - 상태 초기화 + 다시 파일 선택 가능하도록
  const handleUploadClick = () => {
    setUploadError("");
    setRequestError("");
    setDiagnosis(null);
    setSelectedFile(null);

    setPhotoPreview((prev) => {
      cleanupPreview(prev);
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // AI 진단 요청
  // - 작물명 + 이미지 FormData로 전송
  // - 성공 시 diagnosis 상태 업데이트
  const handleDiagnose = async () => {
    if (!selectedFile) {
      setUploadError("진단할 사진을 먼저 업로드해 주세요.");
      return;
    }

    setIsLoading(true);
    setRequestError("");
    setDiagnosis(null);

    try {
      const formData = new FormData();
      formData.append("cropType", selectedCrop.value);
      formData.append("image", selectedFile);

      const result = await diagnoseCrop(formData);

      console.log("진단 결과:", result); // 디버깅용
      if (!result || !result.success) {
        const errorMsg = result?.message || "진단 결과를 받아오지 못했습니다.";
        setRequestError(errorMsg);
        console.error("진단 실패:", errorMsg, result); // 디버깅용
        return;
      }

      setDiagnosis(result);
      // 진단 성공 시 내역 새로고침
      loadDiagnosisHistory();
    } catch (error) {
      console.error("진단 요청 오류:", error); // 디버깅용
      setRequestError(error.message || "진단 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 unmount 시 미리보기 URL 해제
  useEffect(() => {
    return () => {
      cleanupPreview(photoPreview);
    };
  }, [photoPreview]);

  // 신뢰도(%) 계산
  const confidencePercent = diagnosis
    ? Math.round((diagnosis.confidence || 0) * 100)
    : null;

  // UI 렌더링
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
        <div className="ai-crop-card-header">
          <h2 className="ai-crop-title">작물진단</h2>
        </div>
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
                  onClick={() => {
                    // 진단 결과 화면에서 메인으로 돌아가기
                    if (diagnosis) {
                      setDiagnosis(null);
                      setPhotoPreview(null);
                      setSelectedFile(null);
                      setUploadError("");
                      setRequestError("");
                    } else {
                      // 기존 동작 (파일 선택 창 열기)
                      handleUploadClick();
                    }
                  }}
                >
                  {diagnosis ? "다시 진단하기" : "다른 사진 선택"}
                </button>
              </div>
            ) : (
              <label className="upload-label" htmlFor="crop-upload">
                <span>작물 사진 업로드</span>
                <p>이미지를 선택하거나 드래그하세요</p>
              </label>
            )}
            {(uploadError || requestError) && (
              <p className="upload-error">{uploadError || requestError}</p>
            )}
          </div>
          <div className="ai-crop-right">
            {diagnosis ? (
              <div className="diagnosis-report">
                <h3>AI 진단 결과</h3>
                <div className="report-meta">
                  <span className="report-chip">{selectedCrop.label}</span>
                  {confidencePercent !== null && (
                    <span className="report-chip subtle">
                      신뢰도 {confidencePercent}%
                    </span>
                  )}
                  <button
                    type="button"
                    className="diary-share-btn"
                    onClick={() => {
                      // 재배일기 모달 열기 (진단 결과 데이터 전달)
                      if (onOpenDiaryModal) {
                        onOpenDiaryModal({
                          title: `[${selectedCrop.label} 진단] ${diagnosis.label || ""}`,
                          content: `작물: ${selectedCrop.label}\n질병: ${diagnosis.label || ""}\n\n관리 방법:\n${diagnosis.careComment || ""}`,
                          image: selectedFile,
                          imagePreview: photoPreview,
                        });
                      }
                      // 작물 진단 모달 닫기
                      if (onClose) {
                        onClose();
                      }
                    }}
                  >
                    재배 일기로 공유하기
                  </button>
                </div>
                <div className="report-scroll-area">
                  <dl className="diagnosis-summary">
                    <div>
                      <dt>예측 결과</dt>
                      <dd>{diagnosis.label || "결과를 확인할 수 없습니다."}</dd>
                    </div>
                    <div>
                      <dt>관리 방법</dt>
                      <dd>
                        {diagnosis.careComment ||
                          "관리 방법이 제공되지 않았습니다."}
                      </dd>
                    </div>
                  </dl>
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
                        key={crop.value}
                        className={`crop-btn${
                          selectedCrop.value === crop.value ? " selected" : ""
                        }`}
                        onClick={() => setSelectedCrop(crop)}
                        aria-pressed={selectedCrop.value === crop.value}
                      >
                        {crop.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="diagnose-actions">
                  <button
                    type="button"
                    className="history-btn"
                    onClick={() => setCurrentView("history")}
                  >
                    진단 목록
                  </button>
                  <button
                    type="button"
                    className="diagnose-btn"
                    onClick={handleDiagnose}
                    disabled={!photoPreview || isLoading}
                  >
                    {isLoading ? "진단 중..." : "진단하기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 진단 목록 뷰 */}
        {currentView === "history" && (
          <div className="view-overlay">
            <div className="view-content">
              <div className="view-header">
                <h3>진단 목록</h3>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => setCurrentView("main")}
                  aria-label="돌아가기"
                >
                  ←
                </button>
              </div>
              <div className="diagnosis-history-grid">
                {diagnosisHistory.length === 0 ? (
                  <div className="history-empty">
                    아직 진단 내역이 없습니다.
                  </div>
                ) : (
                  diagnosisHistory.map((item) => (
                    <div
                      key={item.diagnosisId}
                      className="history-card"
                      onClick={() => {
                        setSelectedHistory(item);
                        setCurrentView("detail");
                      }}
                    >
                      <div className="history-card-image">
                        <img src={item.photoUrl} alt={item.cropName} />
                      </div>
                      <div className="history-card-info">
                        <h4>{item.diseaseName}</h4>
                        <p className="history-date">
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 상세 결과 뷰 */}
        {currentView === "detail" && selectedHistory && (
          <div className="view-overlay">
            <div className="view-content history-detail-view">
              <div className="ai-crop-card-header">
                <h2 className="ai-crop-title">작물진단</h2>
                <button
                  type="button"
                  className="history-detail-back-btn"
                  onClick={() => {
                    setSelectedHistory(null);
                    setCurrentView("history");
                  }}
                  aria-label="목록으로"
                >
                  ×
                </button>
              </div>
              <div className="ai-crop-card-body">
                <div className="ai-crop-left">
                  <div className="image-preview">
                    <img src={selectedHistory.photoUrl} alt="진단 사진" />
                  </div>
                </div>
                <div className="ai-crop-right">
                  <div className="diagnosis-report">
                    <h3>AI 진단 결과</h3>
                    <div className="report-meta">
                      <span className="report-chip">{selectedHistory.cropName}</span>
                      <button
                        type="button"
                        className="diary-share-btn"
                        onClick={() => {
                          // 재배일기 모달 열기
                          if (onOpenDiaryModal) {
                            onOpenDiaryModal({
                              title: `[${selectedHistory.cropName} 진단] ${selectedHistory.diseaseName}`,
                              content: `작물: ${selectedHistory.cropName}\n질병: ${selectedHistory.diseaseName}\n\n관리 방법:\n${selectedHistory.recommendation}`,
                              photoUrl: selectedHistory.photoUrl,
                            });
                          }
                          // 작물 진단 모달 닫기
                          if (onClose) {
                            onClose();
                          }
                        }}
                      >
                        재배 일기로 공유하기
                      </button>
                    </div>
                    <div className="report-scroll-area">
                      <dl className="diagnosis-summary">
                        <div>
                          <dt>예측 결과</dt>
                          <dd>{selectedHistory.diseaseName}</dd>
                        </div>
                        <div>
                          <dt>관리 방법</dt>
                          <dd>{selectedHistory.recommendation}</dd>
                        </div>
                        <div>
                          <dt>진단 날짜</dt>
                          <dd>{new Date(selectedHistory.createdAt).toLocaleString('ko-KR')}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AICropSearchPage;
