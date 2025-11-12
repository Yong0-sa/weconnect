import { useState } from "react";
import "./DiaryModal.css";

const initialEntries = [
  {
    id: 1,
    date: "2025-03-12",
    time: "오전 10:45",
    title: "하우스 토마토 적심 작업",
    summary: "첫 번째 꽃이 피어 곁순을 정리했다. 잎이 전반적으로 건강함.",
    previewImg:
      "https://images.unsplash.com/photo-1465406325909-7c4173b69c69?auto=format&fit=crop&w=400&q=60",
    timestamp: new Date("2025-03-12T10:45:00").getTime(),
  },
  {
    id: 2,
    date: "2025-03-05",
    time: "오후 2:10",
    title: "관수 시스템 점검",
    summary: "드립관 누수 발견. 즉시 교체 완료. 양액비율 1:800 유지.",
    previewImg:
      "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=400&q=60",
    timestamp: new Date("2025-03-05T14:10:00").getTime(),
  },
  {
    id: 3,
    date: "2025-02-27",
    time: "오전 9:00",
    title: "잔디 밭 제초",
    summary: "광폭 제초기로 외곽 제초 완료. 잡초 발생률 10% 이하.",
    previewImg:
      "https://images.unsplash.com/photo-1511697481400-61e89ef01c8d?auto=format&fit=crop&w=400&q=60",
    timestamp: new Date("2025-02-27T09:00:00").getTime(),
  },
];

function DiaryModal({ onClose }) {
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState(() =>
    [...initialEntries].sort((a, b) => b.timestamp - a.timestamp)
  );
  const [draft, setDraft] = useState({
    date: "",
    content: "",
    file: null,
  });

  const selectedEntry = selectedEntryId
    ? entries.find((entry) => entry.id === selectedEntryId)
    : null;
  const editingEntry = editingEntryId
    ? entries.find((entry) => entry.id === editingEntryId)
    : null;
  const isPanelOpen = isWriting || !!selectedEntry || !!editingEntry;
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    return entry.summary
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
  });
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput);
  };

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
        <div>
          <h2>재배 일기</h2>
        </div>
        <div className="diary-controls">
          <form className="diary-search-group" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="diary-search"
              placeholder="본문으로 일기 검색"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button
              type="submit"
              className="diary-search-btn"
              aria-label="일기 검색"
            >
              🔍
            </button>
          </form>
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
              setDraft({ date: "", content: "", file: null });
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
            {filteredEntries.map((entry) => (
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
                          file: entry.previewImg,
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
                        setEntries((prev) =>
                          prev.filter((item) => item.id !== entry.id)
                        );
                        if (selectedEntryId === entry.id) {
                          setSelectedEntryId(null);
                        }
                        if (editingEntryId === entry.id) {
                          setEditingEntryId(null);
                          setDraft({ date: "", content: "", file: null });
                        }
                        setIsEditing(false);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </article>
            ))}
            {searchQuery && (
              <button
                type="button"
                className="diary-search-reset"
                onClick={() => {
                  setSearchQuery("");
                  setSearchInput("");
                }}
              >
                리스트로 돌아가기
              </button>
            )}
          </div>
        </div>
        <div className={`diary-panel${isPanelOpen ? " open" : ""}`}>
          {isWriting || editingEntry ? (
            <form
              className="diary-write-form"
              onSubmit={(event) => {
                event.preventDefault();
                const baseDate = draft.date
                  ? new Date(`${draft.date}T00:00:00`)
                  : new Date();
                const newEntry = {
                  id: Date.now(),
                  date: baseDate.toISOString().slice(0, 10),
                  time: baseDate.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  title: "새 일기",
                  summary: draft.content || "작성 내용 없음",
                  previewImg: draft.file || null,
                  timestamp: baseDate.getTime(),
                };
                setEntries((prev) => {
                  const next = editingEntry
                    ? prev.map((item) =>
                        item.id === editingEntry.id
                          ? { ...newEntry, id: editingEntry.id }
                          : item
                      )
                    : [...prev, newEntry];
                  return next.sort((a, b) => b.timestamp - a.timestamp);
                });
                setDraft({ date: "", content: "", file: null });
                setIsWriting(false);
                setEditingEntryId(null);
                if (editingEntry) {
                  setIsEditing(false);
                }
              }}
            >
              <div className="diary-write-form__header">
                <h3>{editingEntry ? "일기 수정" : "새 일기 작성"}</h3>
              </div>
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
                      setDraft((prev) => ({ ...prev, file: null }));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setDraft((prev) => ({ ...prev, file: reader.result }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
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
                    setDraft({ date: "", content: "", file: null });
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
