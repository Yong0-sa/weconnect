import { useCallback, useEffect, useMemo, useState } from "react";
import ChatModal from "./ChatModal";
import "./MemberInfoManageModal.css";
import {
  fetchOwnerContracts,
  updateContractStatus,
  deleteContract,
} from "../api/farmContracts";

const STATUS_DISPLAY = {
  PENDING: "승인 대기",
  APPROVED: "사용 중",
  REJECTED: "거절됨",
  EXPIRED: "만료됨",
};

const columns = [
  { key: "nickname", label: "닉네임" },
  { key: "email", label: "이메일" },
  { key: "status", label: "신청 상태" },
  { key: "name", label: "이름" },
  { key: "phone", label: "전화번호" },
  { key: "startDate", label: "계약 시작일" },
  { key: "endDate", label: "계약 종료일" },
];

function MemberInfoManageModal({ profile, onClose = () => {} }) {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [dateDrafts, setDateDrafts] = useState({});
  const [editingRows, setEditingRows] = useState({});
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatContact, setChatContact] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const totalMembers = contracts.length;
  const allSelected = totalMembers > 0 && selectedIds.length === totalMembers;

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOwnerContracts();
      const normalized = Array.isArray(data) ? data : [];
      setContracts(normalized);
      setDateDrafts(
        normalized.reduce((acc, contract) => {
          acc[contract.contractId] = {
            startDate: contract.startDate || "",
            endDate: contract.endDate || "",
          };
          return acc;
        }, {})
      );
      setEditingRows(
        normalized.reduce((acc, contract) => {
          acc[contract.contractId] = false;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err?.message || "회원 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => contracts.some((contract) => contract.contractId === id))
    );
    setDateDrafts((prev) => {
      const next = {};
      contracts.forEach((contract) => {
        const existing = prev[contract.contractId];
        next[contract.contractId] = {
          startDate: existing?.startDate ?? contract.startDate ?? "",
          endDate: existing?.endDate ?? contract.endDate ?? "",
        };
      });
      return next;
    });
    setEditingRows((prev) => {
      const next = {};
      contracts.forEach((contract) => {
        next[contract.contractId] = Boolean(prev?.[contract.contractId] && contract.status !== "PENDING");
      });
      return next;
    });
  }, [contracts]);

  const renderStatusBadge = (status) => {
    const label = STATUS_DISPLAY[status] || status;
    const classSuffix = (label || "")
      .toString()
      .trim()
      .replace(/\s+/g, "-");
    return (
      <span
        className={`member-manage-status member-manage-status--${classSuffix}`}
      >
        {label}
      </span>
    );
  };

  const renderCellValue = (contract, key) => {
    if (!contract) return "-";
    const draft = dateDrafts[contract.contractId] || {
      startDate: contract.startDate || "",
      endDate: contract.endDate || "",
    };
    const allowEdit = contract.status === "PENDING" || editingRows[contract.contractId];
    switch (key) {
      case "status":
        return renderStatusBadge(contract.status);
      case "startDate":
        return allowEdit ? (
          <input
            type="date"
            name="startDate"
            value={draft.startDate}
            onChange={(event) =>
              handleDateChange(contract.contractId, "startDate", event.target.value)
            }
          />
        ) : (
          contract.startDate || "-"
        );
      case "endDate":
        return allowEdit ? (
          <input
            type="date"
            name="endDate"
            value={draft.endDate}
            onChange={(event) =>
              handleDateChange(contract.contractId, "endDate", event.target.value)
            }
          />
        ) : (
          contract.endDate || "-"
        );
      case "nickname":
        return contract.nickname || "-";
      case "email":
        return contract.email || "-";
      case "name":
        return contract.name || "-";
      case "phone":
        return contract.phone || "-";
      default:
        return contract[key] || "-";
    }
  };

  const handleOpenChat = useCallback(
    (contract) => {
      if (!contract) return;
      const parseId = (value) => {
        if (value == null) return null;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      };
      const nextContact = {
        id: `contract-${contract.contractId}`,
        name: contract.name || contract.nickname || contract.email,
        userId: parseId(contract.userId),
        farmerId: parseId(profile?.userId),
        farmId: parseId(contract.farmId),
      };
      setChatContact(nextContact);
      setIsChatModalOpen(true);
    },
    [profile?.userId]
  );

  const handleCloseChat = () => {
    setIsChatModalOpen(false);
    setChatContact(null);
  };

  const handleDateChange = (contractId, field, value) => {
    setDateDrafts((prev) => ({
      ...prev,
      [contractId]: {
        ...(prev[contractId] || { startDate: "", endDate: "" }),
        [field]: value,
      },
    }));
  };

  const handleToggleEdit = (contractId, next) => {
    setEditingRows((prev) => ({
      ...prev,
      [contractId]: typeof next === "boolean" ? next : !prev[contractId],
    }));
  };

  const handleSaveContract = async (contract) => {
    if (!contract || updatingId) return;
    const draft = dateDrafts[contract.contractId] || {};
    try {
      setUpdatingId(contract.contractId);
      const payload = {
        status: contract.status,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        memo: contract.memo,
      };
      const updated = await updateContractStatus(contract.contractId, payload);
      setContracts((prev) =>
        prev.map((item) =>
          item.contractId === updated.contractId ? updated : item
        )
      );
      setDateDrafts((prev) => ({
        ...prev,
        [contract.contractId]: {
          startDate: updated.startDate || "",
          endDate: updated.endDate || "",
        },
      }));
      handleToggleEdit(contract.contractId, false);
      alert("계약 기간이 저장되었습니다.");
    } catch (error) {
      alert(error?.message || "계약 기간을 저장하지 못했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (contract) => {
    if (!contract || updatingId) return;
    const draft = dateDrafts[contract.contractId] || {};
    const resolvedStart = draft.startDate || "";
    const resolvedEnd = draft.endDate || "";

    if (!resolvedStart || !resolvedEnd) {
      alert("계약 시작일과 종료일을 입력해 주세요.");
      return;
    }

    try {
      setUpdatingId(contract.contractId);
      const payload = {
        status: "APPROVED",
        startDate: resolvedStart,
        endDate: resolvedEnd,
        memo: contract.memo,
      };
      const updated = await updateContractStatus(contract.contractId, payload);
      setContracts((prev) =>
        prev.map((item) =>
          item.contractId === updated.contractId ? updated : item
        )
      );
      setDateDrafts((prev) => ({
        ...prev,
        [contract.contractId]: {
          startDate: updated.startDate || "",
          endDate: updated.endDate || "",
        },
      }));
      alert("승인되었습니다.");
    } catch (err) {
      alert(err?.message || "승인에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSelect = (contractId) => {
    setSelectedIds((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contracts.map((contract) => contract.contractId));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || isBulkDeleting) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`선택한 ${selectedIds.length}명의 신청을 삭제하시겠습니까?`)
    ) {
      return;
    }
    try {
      setIsBulkDeleting(true);
      for (const id of selectedIds) {
        await deleteContract(id);
      }
      setContracts((prev) =>
        prev.filter((contract) => !selectedIds.includes(contract.contractId))
      );
      setDateDrafts((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setEditingRows((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setSelectedIds([]);
      alert("삭제되었습니다.");
    } catch (error) {
      alert(error?.message || "삭제하지 못했습니다.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (profile?.farmName) {
      return `${profile.farmName} 회원 현황`;
    }
    return "회원 현황";
  }, [profile?.farmName]);

  return (
    <div className="member-manage-modal">
      <header className="member-manage-modal__header">
        <div>
          <p className="member-manage-eyebrow">회원 정보 관리</p>
          <h2>{headerTitle}</h2>
          <p className="member-manage-description">
            회원 목록을 확인하고 승인 상태를 관리할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          className="member-manage-close"
          aria-label="회원 정보 관리 닫기"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <section className="member-manage-panel">
        <div className="member-manage-panel__head">
          <p className="member-manage-count">
            전체 신청자 <strong>{totalMembers}명</strong>
          </p>
          <div className="member-manage-controls">
            <button
              type="button"
              className="member-manage-link"
              onClick={handleBulkDelete}
              disabled={!selectedIds.length || isBulkDeleting}
            >
              삭제
            </button>
          </div>
        </div>

        <div className="member-manage-table" role="table" aria-label="회원 목록">
          <div className="member-manage-row member-manage-row--head" role="row">
            <label className="member-manage-checkbox">
              <input
                type="checkbox"
                aria-label="전체 선택"
                checked={allSelected}
                onChange={toggleSelectAll}
                disabled={!contracts.length}
              />
              <span />
            </label>
            {columns.map((column) => (
              <div key={column.key} className="member-manage-cell" role="columnheader">
                {column.label}
              </div>
            ))}
            <div
              className="member-manage-cell member-manage-cell--actions"
              aria-hidden="true"
            />
          </div>

          {isLoading ? (
            <p className="member-manage-empty" role="row">
              회원 정보를 불러오는 중입니다...
            </p>
          ) : error ? (
            <p className="member-manage-empty" role="row">
              {error}
            </p>
          ) : contracts.length === 0 ? (
            <p className="member-manage-empty" role="row">
              아직 신청한 회원이 없습니다.
            </p>
          ) : (
            contracts.map((contract) => (
              <div className="member-manage-row" role="row" key={contract.contractId}>
                <label className="member-manage-checkbox">
                  <input
                    type="checkbox"
                    aria-label={`${contract.name || contract.nickname || contract.email} 선택`}
                    checked={selectedIds.includes(contract.contractId)}
                    onChange={() => toggleSelect(contract.contractId)}
                  />
                  <span />
                </label>
                {columns.map((column) => (
                  <div key={column.key} className="member-manage-cell" role="cell">
                    {renderCellValue(contract, column.key)}
                  </div>
                ))}
                <div className="member-manage-cell member-manage-cell--actions" role="cell">
                  <button
                    type="button"
                    className="member-manage-inline-btn member-manage-inline-btn--chat"
                    onClick={() => handleOpenChat(contract)}
                  >
                    채팅
                  </button>
                  {contract.status === "PENDING" ? (
                    <button
                      type="button"
                      className="member-manage-inline-btn member-manage-inline-btn--primary"
                      onClick={() => handleApprove(contract)}
                      disabled={updatingId === contract.contractId}
                    >
                      승인
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="member-manage-inline-btn"
                      onClick={() =>
                        editingRows[contract.contractId]
                          ? handleSaveContract(contract)
                          : handleToggleEdit(contract.contractId, true)
                      }
                      disabled={updatingId === contract.contractId}
                    >
                      {editingRows[contract.contractId] ? "저장" : "수정"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
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
