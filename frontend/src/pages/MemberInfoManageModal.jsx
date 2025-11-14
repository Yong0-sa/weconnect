import { useEffect, useMemo, useState } from "react";
import ChatModal from "./ChatModal";
import "./MemberInfoManageModal.css";

const STATUS_OPTIONS = ["승인 대기", "사용 중", "만료됨"];

const createEmptyDraft = () => ({
  nickname: "",
  email: "",
  status: STATUS_OPTIONS[0],
  name: "",
  phone: "",
  contractStart: "",
  contractEnd: "",
});

const SAMPLE_MEMBERS = [
  {
    id: "1",
    nickname: "그린러버",
    email: "green@example.com",
    status: "사용 중",
    name: "홍길동",
    phone: "010-1234-0000",
    contractStart: "2025-01-15",
    contractEnd: "2026-01-14",
  },
  {
    id: "2",
    nickname: "주말농부",
    email: "garden@example.com",
    status: "승인 대기",
    name: "김채소",
    phone: "010-5678-1111",
    contractStart: "2024-10-01",
    contractEnd: "2025-09-30",
  },
];

const buildDraftMap = (list, prevDrafts = {}) =>
  list.reduce((acc, member) => {
    acc[member.id] = prevDrafts[member.id]
      ? { ...prevDrafts[member.id] }
      : { ...member };
    return acc;
  }, {});

function MemberInfoManageModal({ profile, onClose = () => {} }) {
  const [members, setMembers] = useState(SAMPLE_MEMBERS);
  const [rowDrafts, setRowDrafts] = useState(() => buildDraftMap(SAMPLE_MEMBERS));
  const [selectedIds, setSelectedIds] = useState([]);
  const [createRows, setCreateRows] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatContact, setChatContact] = useState(null);

  const totalMembers = members.length;
  const allSelected = totalMembers > 0 && selectedIds.length === totalMembers;

  const columns = useMemo(
    () => [
      { key: "nickname", label: "닉네임" },
      { key: "email", label: "이메일" },
      { key: "status", label: "신청 상태" },
      { key: "name", label: "이름" },
      { key: "phone", label: "전화번호" },
      { key: "contractStart", label: "계약 시작일" },
      { key: "contractEnd", label: "계약 종료일" },
    ],
    []
  );

  useEffect(() => {
    setRowDrafts((prev) => buildDraftMap(members, prev));
  }, [members]);

  const handleAddRow = () => {
    if (isEditMode) return;
    const newRow = {
      id: `temp-${Date.now()}`,
      data: createEmptyDraft(),
    };
    setCreateRows((prev) => [...prev, newRow]);
    setSelectedIds([]);
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setCreateRows([]);
    setSelectedIds([]);
  };

  const handleConfirmEdit = () => {
    setIsEditMode(false);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((member) => member.id));
    }
  };

  const toggleRowSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleRowInputChange = (memberId, field, value) => {
    setRowDrafts((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value,
      },
    }));
  };

  const handleDeleteSelected = () => {
    if (!isEditMode) return;
    if (!selectedIds.length) {
      alert("삭제할 회원을 선택해 주세요.");
      return;
    }
    if (!window.confirm("선택한 회원을 삭제하시겠습니까?")) return;
    setMembers((prev) => prev.filter((member) => !selectedIds.includes(member.id)));
    setSelectedIds([]);
  };

  const handleSubmitRow = (memberId) => {
    const draft = rowDrafts[memberId];
    if (!draft) return;
    if (!draft.nickname?.trim() || !draft.email?.trim()) {
      alert("닉네임과 이메일은 필수입니다.");
      return;
    }
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, ...draft } : member))
    );
  };

  const handleCreateRowChange = (rowId, field, value) => {
    setCreateRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              data: {
                ...row.data,
                [field]: value,
              },
            }
          : row
      )
    );
  };

  const handleRemoveCreateRow = (rowId) => {
    setCreateRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleSubmitAllRows = () => {
    if (createRows.length === 0) {
      alert("등록할 회원이 없습니다.");
      return;
    }

    const invalidRows = createRows.filter(
      (row) => !row.data.nickname?.trim() || !row.data.email?.trim()
    );

    if (invalidRows.length > 0) {
      alert("모든 행의 닉네임과 이메일은 필수입니다.");
      return;
    }

    const newMembers = createRows.map((row) => ({
      ...row.data,
      id: String(Date.now()) + Math.random(),
    }));

    setMembers((prev) => [...newMembers, ...prev]);
    setRowDrafts((prev) => {
      const newDrafts = { ...prev };
      newMembers.forEach((member) => {
        newDrafts[member.id] = { ...member };
      });
      return newDrafts;
    });
    setCreateRows([]);
  };

  const handleCloseModal = () => {
    setIsEditMode(false);
    setSelectedIds([]);
    setCreateRows([]);
    onClose();
  };

  const handleOpenChat = (member) => {
    if (!member) return;
    const parseId = (value) => {
      if (value == null) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };
    const nextContact = {
      id: member.id,
      name: member.name || member.nickname || member.email,
      userId: parseId(member.userId ?? member.id),
      farmerId: parseId(profile?.userId),
      farmId: parseId(profile?.farmId),
    };
    if (member.roomId) {
      nextContact.roomId = member.roomId;
    }
    setChatContact(nextContact);
    setIsChatModalOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatModalOpen(false);
    setChatContact(null);
  };

  const renderEditableInput = (key, value, onChange) => {
    if (key === "status") {
      return (
        <select name={key} value={value} onChange={onChange}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    const inputProps = {
      name: key,
      value: value ?? "",
      onChange,
    };

    if (key === "email") {
      inputProps.type = "email";
      inputProps.placeholder = "example@email.com";
    } else if (key === "contractStart" || key === "contractEnd") {
      inputProps.type = "date";
    } else if (key === "phone") {
      inputProps.type = "text";
      inputProps.placeholder = "010-0000-0000";
    } else {
      inputProps.type = "text";
    }

    return <input {...inputProps} />;
  };

  const renderStaticValue = (member, key) => {
    const value = member[key];
    if (!value) return "-";
    if (key === "status") {
      return (
        <span className={`member-manage-status member-manage-status--${value}`}>
          {value}
        </span>
      );
    }
    return value;
  };

  const renderCreateRow = (row) => (
    <div className="member-manage-row member-manage-row--inline" role="row" key={row.id}>
      {columns.map((column) => (
        <div className="member-manage-cell" role="cell" key={column.key}>
          {renderEditableInput(column.key, row.data[column.key], (event) =>
            handleCreateRowChange(row.id, column.key, event.target.value)
          )}
        </div>
      ))}
      <div className="member-manage-cell member-manage-cell--actions" role="cell">
        <button
          type="button"
          className="member-manage-inline-btn"
          onClick={() => handleRemoveCreateRow(row.id)}
        >
          ×
        </button>
      </div>
    </div>
  );

  const getModalClass = () => {
    if (isEditMode) return 'member-manage-modal member-manage-modal--edit-mode';
    if (createRows.length > 0) return 'member-manage-modal member-manage-modal--create-mode';
    return 'member-manage-modal';
  };

  return (
    <div className={getModalClass()}>
      <header className="member-manage-modal__header">
        <div>
          <p className="member-manage-eyebrow">회원 정보 관리</p>
          <h2>
            {profile?.farmName ? `${profile.farmName} 회원` : "전체 회원"} 현황
          </h2>
          <p className="member-manage-description">
            회원 목록을 직접 관리하고 계약 기간을 업데이트할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          className="member-manage-close"
          aria-label="회원 정보 관리 닫기"
          onClick={handleCloseModal}
        >
          ×
        </button>
      </header>

      <section className="member-manage-panel">
        <div className="member-manage-panel__head">
          <p className="member-manage-count">
            전체 사용자 <strong>{totalMembers}명</strong>
          </p>
          <div className="member-manage-controls">
            {isEditMode ? (
              <>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleConfirmEdit}
                >
                  확인
                </button>
                <span aria-hidden="true">|</span>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleDeleteSelected}
                >
                  삭제
                </button>
              </>
            ) : createRows.length > 0 ? (
              <>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleAddRow}
                >
                  +
                </button>
                <span aria-hidden="true">|</span>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleSubmitAllRows}
                >
                  등록
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleAddRow}
                >
                  +
                </button>
                <span aria-hidden="true">|</span>
                <button
                  type="button"
                  className="member-manage-link"
                  onClick={handleEnterEditMode}
                >
                  편집
                </button>
              </>
            )}
          </div>
        </div>

        <div className="member-manage-table" role="table" aria-label="회원 목록">
          <div className="member-manage-row member-manage-row--head" role="row">
            {isEditMode && (
              <label className="member-manage-checkbox">
                <input
                  type="checkbox"
                  aria-label="전체 선택"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <span />
              </label>
            )}
            {columns.map((column) => (
              <div key={column.key} className="member-manage-cell" role="columnheader">
                {column.label}
              </div>
            ))}
            <div className="member-manage-cell member-manage-cell--actions" aria-hidden="true" />
          </div>

          {members.length === 0 && createRows.length === 0 && (
            <p className="member-manage-empty" role="row">
              등록된 회원이 없습니다. 우측 상단 + 버튼으로 추가해 주세요.
            </p>
          )}

          {members.map((member) => (
            <div className="member-manage-row" role="row" key={member.id}>
              {isEditMode && (
                <label className="member-manage-checkbox">
                  <input
                    type="checkbox"
                    aria-label={`${member.name} 선택`}
                    checked={selectedIds.includes(member.id)}
                    onChange={() => toggleRowSelect(member.id)}
                  />
                  <span />
                </label>
              )}
              {columns.map((column) => (
                <div key={column.key} className="member-manage-cell" role="cell">
                  {isEditMode
                    ? renderEditableInput(
                        column.key,
                        rowDrafts[member.id]?.[column.key],
                        (event) =>
                          handleRowInputChange(
                            member.id,
                            column.key,
                            event.target.value
                          )
                      )
                    : renderStaticValue(member, column.key)}
                </div>
              ))}
              <div className="member-manage-cell member-manage-cell--actions" role="cell">
                <button
                  type="button"
                  className="member-manage-inline-btn member-manage-inline-btn--chat"
                  onClick={() => handleOpenChat(member)}
                >
                  채팅
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    className="member-manage-inline-btn member-manage-inline-btn--primary"
                    onClick={() => handleSubmitRow(member.id)}
                  >
                    등록
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {createRows.length > 0 && !isEditMode && (
          <div className="member-manage-create-row">
            {createRows.map((row) => renderCreateRow(row))}
          </div>
        )}
      </section>
      {isChatModalOpen && (
        <div className="member-manage-chat-modal">
          <ChatModal initialContact={chatContact} onClose={handleCloseChat} />
        </div>
      )}
    </div>
  );
}

export default MemberInfoManageModal;
