import { useEffect, useMemo, useRef, useState } from "react";
import "./CommunityModal.css";
import { farms } from "../data/farms";
import {
  noticePosts as allNoticePosts,
  communityPosts as allCommunityPosts,
} from "../data/mockPosts";
import { fetchMyProfile } from "../api/profile";

const formatToDateString = (value) => {
  if (!value) return "";

  const now = new Date();
  let parsedDate = null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const relativeMatch = trimmed.match(/^(\d+)(일|시간)\s*전$/);

    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      parsedDate = new Date(now);

      if (relativeMatch[2] === "일") {
        parsedDate.setDate(now.getDate() - amount);
      } else if (relativeMatch[2] === "시간") {
        parsedDate.setHours(now.getHours() - amount);
      }
    } else {
      const directParse = new Date(trimmed);
      if (!Number.isNaN(directParse.getTime())) {
        parsedDate = directParse;
      }
    }
  } else {
    parsedDate = new Date(value);
  }

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

function CommunityModal({ onClose }) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedFarm, setSelectedFarm] = useState(farms[0]);
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);
  const [farmSearch, setFarmSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [userNickname, setUserNickname] = useState("");
  const [comments, setComments] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writeImage, setWriteImage] = useState(null);
  const [writeImagePreview, setWriteImagePreview] = useState(null);
  const [writeCategory, setWriteCategory] = useState("board");
  const [localCommunityPosts, setLocalCommunityPosts] =
    useState(allCommunityPosts);
  const dropdownRef = useRef(null);
  const farmSearchInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // 선택된 농장의 게시글만 필터링
  const noticePosts = useMemo(() => {
    return allNoticePosts.filter((post) => post.farmId === selectedFarm.id);
  }, [selectedFarm]);

  const communityPosts = useMemo(() => {
    return localCommunityPosts.filter(
      (post) => post.farmId === selectedFarm.id
    );
  }, [selectedFarm, localCommunityPosts]);

  const filteredBoardPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      return (
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        )
      );
    });
  }, [search, communityPosts]);

  const filteredNoticePosts = useMemo(() => {
    return noticePosts.filter((post) => {
      return (
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        )
      );
    });
  }, [search, noticePosts]);

  const filteredFarms = useMemo(() => {
    if (!farmSearch.trim()) return farms;
    return farms.filter((farm) =>
      farm.name.toLowerCase().includes(farmSearch.toLowerCase())
    );
  }, [farmSearch]);

  const showNotice = activeCategory === "all" || activeCategory === "notice";
  const showBoard = activeCategory === "all" || activeCategory === "board";
  const totalCount =
    (showNotice ? filteredNoticePosts.length : 0) +
    (showBoard ? filteredBoardPosts.length : 0);

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setCommentInput("");
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput);
  };

  const handleCommentSubmit = () => {
    if (!commentInput.trim() || !selectedPost) return;

    const newComment = {
      id: Date.now(),
      author: userNickname || "사용자",
      content: commentInput.trim(),
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setComments((prev) => ({
      ...prev,
      [selectedPost.id]: [...(prev[selectedPost.id] || []), newComment],
    }));

    setCommentInput("");
  };

  const handleReplyClick = (commentId) => {
    setReplyingTo(commentId);
    setReplyInput("");
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyInput("");
  };

  const handleReplySubmit = (commentId) => {
    if (!replyInput.trim() || !selectedPost) return;

    const newReply = {
      id: Date.now(),
      author: userNickname || "사용자",
      content: replyInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => {
      const postComments = prev[selectedPost.id] || [];
      const updatedComments = postComments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
          };
        }
        return comment;
      });

      return {
        ...prev,
        [selectedPost.id]: updatedComments,
      };
    });

    setReplyingTo(null);
    setReplyInput("");
  };

  // 게시글 수정/삭제
  const handleEditPost = () => {
    setEditingPost(true);
    setEditPostTitle(selectedPost.title);
    setEditPostContent(selectedPost.excerpt);
  };

  const handleSavePost = () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) return;

    // 실제로는 API 호출하여 서버에 저장
    // 여기서는 임시로 selectedPost 업데이트 (백엔드 연동 시 수정 필요)
    setSelectedPost({
      ...selectedPost,
      title: editPostTitle.trim(),
      excerpt: editPostContent.trim(),
    });

    setEditingPost(false);
  };

  const handleCancelEditPost = () => {
    setEditingPost(false);
    setEditPostTitle("");
    setEditPostContent("");
  };

  const handleDeletePost = () => {
    if (window.confirm("게시글을 삭제하시겠습니까?")) {
      // 댓글과 함께 삭제
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[selectedPost.id];
        return newComments;
      });

      // 실제로는 API 호출하여 서버에서 삭제
      // 목록으로 돌아가기
      setSelectedPost(null);
    }
  };

  // 댓글 수정/삭제
  const handleEditComment = (commentId, content, isReply = false) => {
    setEditingComment(commentId);
    setEditCommentContent(content);
  };

  const handleSaveComment = (commentId, parentId = null) => {
    if (!editCommentContent.trim()) return;

    setComments((prev) => {
      const postComments = prev[selectedPost.id] || [];

      if (parentId) {
        // 대댓글 수정
        const updatedComments = postComments.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === commentId
                  ? { ...reply, content: editCommentContent.trim() }
                  : reply
              ),
            };
          }
          return comment;
        });

        return {
          ...prev,
          [selectedPost.id]: updatedComments,
        };
      } else {
        // 댓글 수정
        const updatedComments = postComments.map((comment) =>
          comment.id === commentId
            ? { ...comment, content: editCommentContent.trim() }
            : comment
        );

        return {
          ...prev,
          [selectedPost.id]: updatedComments,
        };
      }
    });

    setEditingComment(null);
    setEditCommentContent("");
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditCommentContent("");
  };

  const handleDeleteComment = (commentId, parentId = null) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    setComments((prev) => {
      const postComments = prev[selectedPost.id] || [];

      if (parentId) {
        // 대댓글 삭제
        const updatedComments = postComments.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.filter(
                (reply) => reply.id !== commentId
              ),
            };
          }
          return comment;
        });

        return {
          ...prev,
          [selectedPost.id]: updatedComments,
        };
      } else {
        // 댓글 삭제 (대댓글도 함께)
        const updatedComments = postComments.filter(
          (comment) => comment.id !== commentId
        );

        return {
          ...prev,
          [selectedPost.id]: updatedComments,
        };
      }
    });
  };

  // 글쓰기 기능
  const handleWriteClick = () => {
    setIsWriting(true);
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);
    setWriteCategory("board");
  };

  const handleWriteCancel = () => {
    setIsWriting(false);
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);
    setWriteCategory("board");
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setWriteImage(file);
      // 미리보기 생성
      const previewUrl = URL.createObjectURL(file);
      setWriteImagePreview(previewUrl);
    }
  };

  const handleWriteSubmit = () => {
    if (!writeTitle.trim() || !writeContent.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    // 새 게시글 생성
    const newPost = {
      id: Date.now(),
      farmId: selectedFarm.id,
      author: userNickname || "사용자",
      role: "회원",
      title: writeTitle.trim(),
      excerpt: writeContent.trim(),
      tags: [],
      likes: 0,
      replies: 0,
      type: "tip", // 자유게시판은 tip 타입
      createdAt: new Date().toISOString(),
      image: writeImagePreview, // 실제로는 서버에서 받은 URL
    };

    // 새 글을 배열 앞에 추가
    setLocalCommunityPosts((prev) => [newPost, ...prev]);

    // 리스트 뷰로 돌아가기
    setIsWriting(false);

    // 초기화
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);
    setWriteCategory("board");
  };

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const profile = await fetchMyProfile();
        setUserNickname(profile.nickname || profile.name || "사용자");
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setUserNickname("사용자");
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isFarmDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsFarmDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isFarmDropdownOpen]);

  useEffect(() => {
    if (isFarmDropdownOpen && farmSearchInputRef.current) {
      farmSearchInputRef.current.focus();
    }
  }, [isFarmDropdownOpen]);

  return (
    <div className="community-modal-card">
      {onClose && (
        <button
          type="button"
          className="community-close-btn"
          onClick={onClose}
          aria-label="커뮤니티 창 닫기"
        >
          ×
        </button>
      )}
      <header className="community-header">
        <div className="community-header-left">
          <h2 className="community-title">커뮤니티</h2>
        </div>
      </header>

      <section className="community-body">
        <aside className="community-sidebar">
          <div className="community-panel combined-panel">
            <div className="panel-block">
              <p className="panel-title">농장 선택</p>
              <div className="community-farm-select" ref={dropdownRef}>
                <div className="farm-select-trigger">
                  {isFarmDropdownOpen ? (
                    <div className="farm-select-search">
                      <input
                        ref={farmSearchInputRef}
                        type="text"
                        value={farmSearch}
                        placeholder="농장 검색"
                        onChange={(event) => setFarmSearch(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <button
                        type="button"
                        className="farm-select-close"
                        onClick={() => {
                          setIsFarmDropdownOpen(false);
                          setFarmSearch("");
                        }}
                        aria-label="드롭다운 닫기"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsFarmDropdownOpen(true)}
                    >
                      <strong>{selectedFarm.name}</strong>
                    </button>
                  )}
                </div>
                {isFarmDropdownOpen && (
                  <div className="farm-select-dropdown">
                    <ul>
                      {filteredFarms.map((farm) => (
                        <li key={farm.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFarm(farm);
                              setFarmSearch("");
                              setIsFarmDropdownOpen(false);
                            }}
                          >
                            <strong>{farm.name}</strong>
                            <span>{farm.location}</span>
                          </button>
                        </li>
                      ))}
                      {filteredFarms.length === 0 && (
                        <li className="empty">
                          <span>일치하는 농장이 없습니다.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="panel-block">
              <p className="panel-title">카테고리</p>
              <div className="category-buttons">
                <button
                  type="button"
                  className={activeCategory === "all" ? "active" : ""}
                  onClick={() => {
                    setActiveCategory("all");
                    setSelectedPost(null);
                  }}
                >
                  전체글보기
                </button>
                <button
                  type="button"
                  className={activeCategory === "notice" ? "active" : ""}
                  onClick={() => {
                    setActiveCategory("notice");
                    setSelectedPost(null);
                  }}
                >
                  공지사항
                </button>
                <button
                  type="button"
                  className={activeCategory === "board" ? "active" : ""}
                  onClick={() => {
                    setActiveCategory("board");
                    setSelectedPost(null);
                  }}
                >
                  자유게시판
                </button>
              </div>
            </div>
            <div className="panel-block">
              <p className="panel-title">키워드 검색</p>
              <form className="community-search-panel" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="검색어 입력"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button type="submit">검색</button>
              </form>
            </div>
          </div>
        </aside>
        <div className="community-feed">
          <div className="community-feed-card">
            {isWriting ? (
              /* 글쓰기 패널 */
              <div className="community-detail-panel">
                <div className="write-header">
                  <select
                    id="write-category-select"
                    className="write-category-select"
                    value={writeCategory}
                    onChange={(e) => setWriteCategory(e.target.value)}
                  >
                    <option value="board">자유게시판</option>
                  </select>
                </div>
                <div className="detail-separator" />

                {/* 제목 입력 */}
                <input
                  type="text"
                  className="write-title-input"
                  placeholder="제목을 입력하세요"
                  value={writeTitle}
                  onChange={(e) => setWriteTitle(e.target.value)}
                />

                {/* 이미지 업로드 */}
                <div className="write-image-section">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="image-upload-btn"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    📷 사진 선택
                  </button>
                  {writeImagePreview && (
                    <div className="image-preview-container">
                      <img
                        src={writeImagePreview}
                        alt="미리보기"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => {
                          setWriteImage(null);
                          setWriteImagePreview(null);
                          if (imageInputRef.current) {
                            imageInputRef.current.value = "";
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 본문 입력 */}
                <textarea
                  className="write-content-textarea"
                  placeholder="내용을 입력하세요"
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                />

                {/* 버튼 영역 */}
                <div className="write-buttons">
                  <button
                    type="button"
                    className="write-cancel-btn"
                    onClick={handleWriteCancel}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="write-submit-btn"
                    onClick={handleWriteSubmit}
                  >
                    등록
                  </button>
                </div>
              </div>
            ) : !selectedPost ? (
              <>
                <div className="list-header-container">
                  <div className="list-header-left">
                    <h3 className="section-title">
                      {activeCategory === "all" && "전체 글 보기"}
                      {activeCategory === "notice" && "공지사항"}
                      {activeCategory === "board" && "자유게시판"}
                    </h3>
                    <span className="list-count">{totalCount}건</span>
                  </div>
                  {(activeCategory === "all" || activeCategory === "board") && (
                    <button
                      type="button"
                      className="community-write-btn"
                      onClick={handleWriteClick}
                    >
                      글쓰기
                    </button>
                  )}
                </div>
                {showNotice &&
                  filteredNoticePosts.map((post) => (
                    <article
                      key={post.id}
                      className="community-post notice"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        <div className="post-title-line">
                          <span className="category-chip">공지</span>
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">{post.author}</span>
                          <span className="post-date">
                            {formatToDateString(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                {showNotice && filteredNoticePosts.length === 0 && (
                  <div className="community-empty small">
                    <p>공지사항이 없습니다.</p>
                  </div>
                )}
                {showBoard &&
                  filteredBoardPosts.map((post) => (
                    <article
                      key={post.id}
                      className="community-post"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        <div className="post-title-line">
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">{post.author}</span>
                          <span className="post-date">
                            {formatToDateString(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                {showBoard && filteredBoardPosts.length === 0 && (
                  <div className="community-empty small">
                    <p>조건에 맞는 글이 없습니다.</p>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => {
                        setSearch("");
                        setSearchInput("");
                      }}
                    >
                      검색 초기화
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="community-detail-panel">
                <div className="detail-toolbar">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    aria-label="목록으로"
                  >
                    목록
                  </button>
                </div>
                <div className="detail-header">
                  <div
                    className={`detail-badge ${
                      noticePosts.some((post) => post.id === selectedPost.id)
                        ? "badge-notice"
                        : "badge-board"
                    }`}
                  >
                    {noticePosts.some((post) => post.id === selectedPost.id)
                      ? "공지"
                      : "자유"}
                  </div>
                </div>
                <div className="detail-title-block">
                  {editingPost ? (
                    <>
                      <input
                        type="text"
                        className="edit-post-title"
                        value={editPostTitle}
                        onChange={(e) => setEditPostTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                      />
                      <div className="edit-post-buttons">
                        <button
                          type="button"
                          onClick={handleCancelEditPost}
                          className="edit-cancel-btn"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePost}
                          className="edit-save-btn"
                        >
                          저장
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4>{selectedPost.title}</h4>
                      <div className="detail-meta">
                        <span className="detail-author">
                          {selectedPost.author}
                        </span>
                        <span className="detail-date">
                          {formatToDateString(selectedPost.createdAt)}
                        </span>
                      </div>
                      {selectedPost.author === userNickname && (
                        <div className="post-action-buttons">
                          <button
                            type="button"
                            onClick={handleEditPost}
                            className="post-edit-btn"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={handleDeletePost}
                            className="post-delete-btn"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="detail-separator" />
                {selectedPost.image && (
                  <div className="detail-image-container">
                    <img
                      src={selectedPost.image}
                      alt={selectedPost.title}
                      className="detail-image"
                    />
                  </div>
                )}
                {editingPost ? (
                  <textarea
                    className="edit-post-content"
                    value={editPostContent}
                    onChange={(e) => setEditPostContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                  />
                ) : (
                  <div className="detail-body">{selectedPost.excerpt}</div>
                )}
                <div className="detail-separator" />
                <div className="detail-comments">
                  {/* 댓글 목록 */}
                  {comments[selectedPost.id] &&
                    comments[selectedPost.id].length > 0 && (
                      <div className="detail-comments-list">
                        {comments[selectedPost.id].map((comment) => (
                          <div key={comment.id} className="comment-wrapper">
                            {/* 댓글 */}
                            <div className="detail-comment-item">
                              <div className="comment-header">
                                <strong className="comment-author">
                                  {comment.author}
                                </strong>
                                {comment.author === userNickname && (
                                  <div className="comment-actions">
                                    <button
                                      type="button"
                                      className="comment-action-btn"
                                      onClick={() =>
                                        handleEditComment(
                                          comment.id,
                                          comment.content
                                        )
                                      }
                                    >
                                      수정
                                    </button>
                                    <button
                                      type="button"
                                      className="comment-action-btn delete"
                                      onClick={() =>
                                        handleDeleteComment(comment.id)
                                      }
                                    >
                                      삭제
                                    </button>
                                  </div>
                                )}
                              </div>
                              {editingComment === comment.id ? (
                                <>
                                  <textarea
                                    className="edit-comment-textarea"
                                    value={editCommentContent}
                                    onChange={(e) =>
                                      setEditCommentContent(e.target.value)
                                    }
                                  />
                                  <div className="comment-edit-buttons">
                                    <button
                                      type="button"
                                      className="comment-action-btn"
                                      onClick={handleCancelEditComment}
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      className="comment-action-btn save"
                                      onClick={() =>
                                        handleSaveComment(comment.id)
                                      }
                                    >
                                      저장
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="comment-content">
                                    {comment.content}
                                  </p>
                                  <div className="comment-footer">
                                    <span className="comment-date">
                                      {new Date(
                                        comment.createdAt
                                      ).toLocaleString("ko-KR", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      className="comment-reply-btn"
                                      onClick={() =>
                                        handleReplyClick(comment.id)
                                      }
                                    >
                                      답글
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 대댓글 목록 */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="reply-list">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="detail-comment-item reply-item"
                                  >
                                    <div className="comment-header">
                                      <strong className="comment-author">
                                        {reply.author}
                                      </strong>
                                      {reply.author === userNickname && (
                                        <div className="comment-actions">
                                          <button
                                            type="button"
                                            className="comment-action-btn"
                                            onClick={() =>
                                              handleEditComment(
                                                reply.id,
                                                reply.content
                                              )
                                            }
                                          >
                                            수정
                                          </button>
                                          <button
                                            type="button"
                                            className="comment-action-btn delete"
                                            onClick={() =>
                                              handleDeleteComment(
                                                reply.id,
                                                comment.id
                                              )
                                            }
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingComment === reply.id ? (
                                      <>
                                        <textarea
                                          className="edit-comment-textarea"
                                          value={editCommentContent}
                                          onChange={(e) =>
                                            setEditCommentContent(
                                              e.target.value
                                            )
                                          }
                                        />
                                        <div className="comment-edit-buttons">
                                          <button
                                            type="button"
                                            className="comment-action-btn"
                                            onClick={handleCancelEditComment}
                                          >
                                            취소
                                          </button>
                                          <button
                                            type="button"
                                            className="comment-action-btn save"
                                            onClick={() =>
                                              handleSaveComment(
                                                reply.id,
                                                comment.id
                                              )
                                            }
                                          >
                                            저장
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <p className="comment-content">
                                          {reply.content}
                                        </p>
                                        <div className="comment-footer">
                                          <span className="comment-date">
                                            {new Date(
                                              reply.createdAt
                                            ).toLocaleString("ko-KR", {
                                              year: "numeric",
                                              month: "2-digit",
                                              day: "2-digit",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 대댓글 입력창 */}
                            {replyingTo === comment.id && (
                              <div className="reply-input-wrapper">
                                <div className="detail-comment-input reply-input">
                                  <div className="comment-input-header">
                                    <strong className="comment-input-nickname">
                                      {userNickname || "사용자"}
                                    </strong>
                                  </div>
                                  <textarea
                                    value={replyInput}
                                    placeholder="답글을 입력하세요"
                                    onChange={(event) =>
                                      setReplyInput(event.target.value)
                                    }
                                    autoFocus
                                  />
                                  <div className="reply-input-buttons">
                                    <button
                                      type="button"
                                      className="reply-cancel-btn"
                                      onClick={handleReplyCancel}
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      className="detail-comment-submit"
                                      onClick={() =>
                                        handleReplySubmit(comment.id)
                                      }
                                    >
                                      등록
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  {/* 댓글 입력창 */}
                  <div className="detail-comment-input">
                    <div className="comment-input-header">
                      <strong className="comment-input-nickname">
                        {userNickname || "사용자"}
                      </strong>
                    </div>
                    <textarea
                      value={commentInput}
                      placeholder="댓글을 입력하세요"
                      onChange={(event) => setCommentInput(event.target.value)}
                    />
                    <button
                      type="button"
                      className="detail-comment-submit"
                      onClick={handleCommentSubmit}
                    >
                      등록
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CommunityModal;
