import { useState, useEffect } from "react";
import "./DiaryModal.css";
import {
  getDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
  searchDiaries,
} from "../api/diary";
import { useCoins } from "../contexts/CoinContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function DiaryModal({ onClose, initialData = null }) {
  const [isWriting, setIsWriting] = useState(!!initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const { addCoins } = useCoins();
  const [draft, setDraft] = useState(() => {
    // initialData가 있으면 진단 결과로 초기화
    if (initialData) {
      const today = new Date().toISOString().split('T')[0];
      return {
        date: today,
        content: initialData.content || "",
        file: initialData.image || null,
        title: initialData.title || "",
        preview: initialData.imagePreview || null,
      };
    }
    return {
      date: "",
      content: "",
      file: null,
      title: "",
      preview: null,
    };
  });

  // 백엔드 응답을 프론트엔드 형식으로 변환
  const convertToEntry = (diary) => {
    // selectAt이 있으면 사용, 없으면 createdAt 사용
    const dateToUse = diary.selectAt || diary.createdAt;

    // 날짜 문자열에서 날짜 부분만 추출 (YYYY-MM-DD 형식)
    let dateStr;
    if (typeof dateToUse === 'string') {
      // ISO 형식 문자열에서 날짜 부분만 추출
      dateStr = dateToUse.split('T')[0];
    } else {
      // 이미 Date 객체인 경우
      dateStr = dateToUse.toISOString().split('T')[0];
    }

    // 날짜 문자열을 직접 사용하여 시간대 문제 방지
    const dateObj = new Date(dateStr + 'T00:00:00');

    // DB에 저장된 Base64 데이터 URL 그대로 사용 (data:image/jpeg;base64,... 형식)
    const imageUrl = diary.photoUrl || null;
    return {
      id: diary.diaryId,
      date: dateStr, // 날짜 부분만 사용
      time: dateObj.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      title: diary.title || "새 일기",
      summary: diary.content || "",
      previewImg: imageUrl, // Base64 Data URL 그대로 사용
      timestamp: dateObj.getTime(),
    };
  };

  // 일기 목록 불러오기
  const loadDiaries = async () => {
    try {
      setLoading(true);
      const data = await getDiaries();
      const convertedEntries = data.map(convertToEntry);
      // selectAt 기준으로 정렬 (이미 백엔드에서 정렬되어 오지만, 프론트엔드에서도 정렬)
      setEntries(convertedEntries.sort((a, b) => {
        // 날짜가 같으면 timestamp로 정렬
        if (a.date === b.date) {
          return b.timestamp - a.timestamp;
        }
        // 날짜 기준 내림차순
        return b.date.localeCompare(a.date);
      }));
    } catch (error) {
      console.error("일기 목록 불러오기 실패:", error);
      alert(error.message || "일기 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 일기 목록 불러오기
  useEffect(() => {
    loadDiaries();
  }, []);

  // 검색 실행
  const handleSearch = async () => {
    if (!searchInput.trim()) {
      loadDiaries();
      setSearchQuery("");
      return;
    }

    try {
      setLoading(true);
      const data = await searchDiaries(searchInput);
      const convertedEntries = data.map(convertToEntry);
      // selectAt 기준으로 정렬 (이미 백엔드에서 정렬되어 오지만, 프론트엔드에서도 정렬)
      setEntries(convertedEntries.sort((a, b) => {
        // 날짜가 같으면 timestamp로 정렬
        if (a.date === b.date) {
          return b.timestamp - a.timestamp;
        }
        // 날짜 기준 내림차순
        return b.date.localeCompare(a.date);
      }));
      setSearchQuery(searchInput);
    } catch (error) {
      console.error("일기 검색 실패:", error);
      alert(error.message || "일기 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 일기 작성/수정
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const diaryData = {
        title: draft.title || null,
        content: draft.content || null,
        date: draft.date && draft.date.trim() !== "" ? draft.date : null, // 선택한 날짜 전송
      };

      if (editingEntry) {
        // 수정
        await updateDiary(editingEntry.id, diaryData, draft.file);
        setToast({ type: "success", message: "일기가 수정되었습니다." });
      } else {
        // 작성
        await createDiary(diaryData, draft.file);

        const rewarded = await addCoins(1, "diary");
        setToast({
          type: rewarded ? "success" : "info",
          message: rewarded
            ? "일기가 저장되었습니다! 코인 1개 적립!"
            : "일기가 저장되었습니다. (코인 적립에 실패했습니다.)",
        });
      }

      // 목록 새로고침
      await loadDiaries();

      setDraft({ date: "", content: "", file: null, title: "", preview: null });
      setIsWriting(false);
      setEditingEntryId(null);
      if (editingEntry) {
        setIsEditing(false);
      }

      // 토스트 자동 제거
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("일기 저장 실패:", error);
      console.error("에러 상세:", error.message, error.stack);
      setToast({ type: "error", message: error.message || "일기 저장에 실패했습니다." });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // 일기 삭제
  const handleDelete = async (entryId) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteDiary(entryId);
      await loadDiaries();

      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
      }
            if (editingEntryId === entryId) {
              setEditingEntryId(null);
              setDraft({ date: "", content: "", file: null, title: "", preview: null });
            }
      setIsEditing(false);
    } catch (error) {
      console.error("일기 삭제 실패:", error);
      alert(error.message || "일기 삭제에 실패했습니다.");
    }
  };

  const selectedEntry = selectedEntryId
    ? entries.find((entry) => entry.id === selectedEntryId)
    : null;
  const editingEntry = editingEntryId
    ? entries.find((entry) => entry.id === editingEntryId)
    : null;
  const isPanelOpen = isWriting || !!selectedEntry || !!editingEntry;
  const filteredEntries = entries;

  return (
    <div className="diary-modal-card">
      {toast && (
        <div
          className={`diary-toast diary-toast--${toast.type}`}
          role="status"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="알림 닫기"
          >
            ×
          </button>
        </div>
      )}
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
        <div>
          <h2>재배 일기</h2>
        </div>
        <div className="diary-controls">
          <div className="diary-search-group">
            <input
              type="text"
              className="diary-search"
              placeholder="본문으로 일기 검색"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyPress={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button
              type="button"
              className="diary-search-btn"
              aria-label="일기 검색"
              onClick={handleSearch}
            >
              🔍
            </button>
          </div>
          <button
            type="button"
            className={`diary-control-btn${isEditing ? " active" : ""}`}
            onClick={() => setIsEditing((prev) => !prev)}
          >
            편집
          </button>
          <button
            type="button"
            className="diary-write-btn"
                  onClick={() => {
                    setSelectedEntryId(null);
                    setEditingEntryId(null);
                    setDraft({ date: "", content: "", file: null, title: "", preview: null });
                    setIsWriting(true);
                  }}
          >
            글쓰기
          </button>
        </div>
      </header>
      <section className={`diary-layout${isPanelOpen ? " panel-open" : ""}`}>
        <div className="diary-list-panel">
          <div className="diary-list">
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                로딩 중...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                작성된 일기가 없습니다.
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className={`diary-list-item${
                    selectedEntryId === entry.id ? " selected" : ""
                  }${isEditing ? " editing" : ""}`}
                  onClick={() => {
                    if (isEditing) return;
                    setIsWriting(false);
                    setEditingEntryId(null);
                    setSelectedEntryId(entry.id);
                  }}
                >
                  <div className="diary-list-info">
                    <p className="diary-list-date">{entry.date}</p>
                    <p className="diary-list-summary">{entry.summary}</p>
                  </div>
                  {entry.previewImg && (
                    <div className="diary-list-thumb">
                      <img src={entry.previewImg} alt={entry.title} />
                    </div>
                  )}
                  {isEditing && (
                    <div className="diary-list-edit">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsWriting(false);
                          setSelectedEntryId(null);
                        setEditingEntryId(entry.id);
                        setDraft({
                          date: entry.date,
                          content: entry.summary,
                          file: null, // 파일 객체는 다시 선택해야 함
                          preview: entry.previewImg, // 기존 이미지 미리보기
                          title: entry.title,
                        });
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(entry.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
            {searchQuery && (
              <button
                type="button"
                className="diary-search-reset"
                onClick={() => {
                  setSearchQuery("");
                  setSearchInput("");
                  loadDiaries();
                }}
              >
                리스트로 돌아가기
              </button>
            )}
          </div>
        </div>
        <div className={`diary-panel${isPanelOpen ? " open" : ""}`}>
          {isWriting || editingEntry ? (
            <form className="diary-write-form" onSubmit={handleSubmit}>
              <div className="diary-write-form__header">
                <h3>{editingEntry ? "일기 수정" : "새 일기 작성"}</h3>
              </div>
              <label>
                제목
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="일기 제목을 입력하세요"
                />
              </label>
              <label>
                작성일
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </label>
              <label className="diary-upload">
                사진 업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setDraft((prev) => ({ ...prev, file: null, preview: null }));
                      return;
                    }
                    setDraft((prev) => ({ ...prev, file: file }));
                    const reader = new FileReader();
                    reader.onload = () => {
                      setDraft((prev) => ({ ...prev, preview: reader.result }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {draft.preview && (
                  <div style={{ marginTop: "10px" }}>
                    <img
                      src={draft.preview}
                      alt="미리보기"
                      style={{ maxWidth: "200px", maxHeight: "200px" }}
                    />
                  </div>
                )}
              </label>
              <label className="diary-content-field">
                내용
                <textarea
                  placeholder="오늘의 재배 상황을 기록하세요"
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      content: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="diary-write-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsWriting(false);
                    setEditingEntryId(null);
                    setDraft({ date: "", content: "", file: null, title: "", preview: null });
                  }}
                >
                  취소
                </button>
                <button type="submit" className="submit">
                  {editingEntry ? "수정" : "저장"}
                </button>
              </div>
            </form>
          ) : (
            selectedEntry && (
              <div className="diary-detail-panel">
                <button
                  type="button"
                  className="diary-detail-close"
                  onClick={() => setSelectedEntryId(null)}
                  aria-label="상세 보기 닫기"
                >
                  ×
                </button>
                <div className="diary-detail-body">
                  {selectedEntry.previewImg && (
                    <div className="diary-detail-image">
                      <img
                        src={selectedEntry.previewImg}
                        alt={selectedEntry.title}
                      />
                    </div>
                  )}
                  <p className="diary-detail-date">{selectedEntry.date}</p>
                  <h3>{selectedEntry.title}</h3>
                  <p className="diary-detail-summary">
                    {selectedEntry.summary}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

export default DiaryModal;
