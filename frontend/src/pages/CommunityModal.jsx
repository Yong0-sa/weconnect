import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./CommunityModal.css";
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
  const [farmList, setFarmList] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);
  const [farmSearch, setFarmSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [userNickname, setUserNickname] = useState("");
  const [userId, setUserId] = useState(null); // 추가: 사용자 ID
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
  const [localCommunityPosts, setLocalCommunityPosts] = useState(allCommunityPosts);
  const dropdownRef = useRef(null);
  const farmSearchInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const generateUniqueId = () => Date.now() + Math.random();


  // 선택된 농장의 게시글만 필터링
  const noticePosts = useMemo(() => {
      if (!selectedFarm || !selectedFarm.farmId) return [];
    return allNoticePosts.filter((post) => post.farmId === selectedFarm.farmId);
  }, [selectedFarm]);

  const communityPosts = useMemo(() => {
      if (!selectedFarm || !selectedFarm.farmId) return [];
    return localCommunityPosts.filter(
      (post) => post.farmId === selectedFarm.farmId
    );
  }, [selectedFarm, localCommunityPosts]);

  const filteredBoardPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      return (
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.content.toLowerCase().includes(search.toLowerCase()) ||
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
        post.content.toLowerCase().includes(search.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        )
      );
    });
  }, [search, noticePosts]);

  const filteredFarms = useMemo(() => {
    if (!farmSearch.trim()) return farmList;
    return farmList.filter((farm) =>
      farm.name.toLowerCase().includes(farmSearch.toLowerCase())
    );
  }, [farmSearch, farmList]);


  const showNotice = activeCategory === "all" || activeCategory === "notice";
  const showBoard = activeCategory === "all" || activeCategory === "board";
  const totalCount =
    (showNotice ? filteredNoticePosts.length : 0) +
    (showBoard ? filteredBoardPosts.length : 0);

  const handlePostClick = async (post) => {
    setSelectedPost(post);
    setCommentInput("");

    try {
        const response = await axios.get(`/api/comments?postId=${post.id}`);
        setComments((prev) => ({
          ...prev,
          [post.id]: response.data,
        }));
      } catch (error) {
        console.error("댓글 불러오기 실패:", error);
      }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput);
  };

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || !selectedPost) return;

    const response = await axios.post("/api/comments", {
        postId: selectedPost.id,
        authorId: userId,
        content: commentInput.trim(),
        });
    console.log(selectedPost.id, userId, commentInput.trim());

    console.log(response.data);

    const newComment = response.data;

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
      id: generateUniqueId(),
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
    setEditPostContent(selectedPost.content);
  };

  const handleSavePost = async () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) return;

    try {
        // 1. PUT 요청: 백엔드 컨트롤러와 매핑
        const response = await axios.put(
          `/api/posts/${selectedPost.id}?requesterId=${userId}`,
          {
            title: editPostTitle.trim(),
            content: editPostContent.trim(),
          }
        );

    setSelectedPost((prev) => ({
      ...prev,
      title: editPostTitle.trim(),
      content: editPostContent.trim(),
    }));

    setLocalCommunityPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPost.id
              ? { ...post, title: editPostTitle.trim(), content: editPostContent.trim() }
              : post
          )
        );
    setEditingPost(false);
    alert("글이 수정되었습니다!");
  } catch (error) {
      console.error("글 수정 실패:", error);
      alert("글 수정 실패: " + (error.response?.data || error.message));
      }
  };

  const handleCancelEditPost = () => {
    setEditingPost(false);
    setEditPostTitle("");
    setEditPostContent("");
  };

  const handleDeletePost = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

     try {
         await axios.delete(`/api/posts/${selectedPost.id}?requesterId=${userId}`);

         setLocalCommunityPosts((prevPosts) =>
         prevPosts.filter(post => post.id !== selectedPost.id)
         );
         setComments((prev) => {
                 const newComments = { ...prev };
                 delete newComments[selectedPost.id];
                 return newComments;
               });
           setSelectedPost(null);

           // 삭제 성공 시 알림
           alert("게시글이 삭제되었습니다.")

         } catch (error) {
             console.error("게시글 삭제 실패:", error);
             alert("삭제 실패: " + (error.response?.data || error.message));
             }
  };

  // 댓글 수정/삭제
  const handleEditComment = (commentId, content, isReply = false) => {
    setEditingComment(commentId);
    setEditCommentContent(content);
  };

  const handleSaveComment = async (commentId, parentId = null) => {
    if (!editCommentContent.trim()) return;

    try {
      // 1. 백엔드에 수정 요청
      await axios.put(`/api/comments/${commentId}?requesterId=${userId}`, {
        content: editCommentContent,
      });

      // 2. 요청 성공 시 로컬 상태 업데이트
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];

        if (parentId) {
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

          return { ...prev, [selectedPost.id]: updatedComments };
        } else {
          const updatedComments = postComments.map((comment) =>
            comment.id === commentId
              ? { ...comment, content: editCommentContent.trim() }
              : comment
          );

          return { ...prev, [selectedPost.id]: updatedComments };
        }
      });

      setEditingComment(null);
      setEditCommentContent("");
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글 수정 실패: " + (error.response?.data || error.message));
    }
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
      const previewUrl = URL.createObjectURL(file);
      setWriteImagePreview(previewUrl);
    }
  };

  // ✅ 백엔드 API 연동 - 글쓰기 제출 (JSON만 전송)
  const handleWriteSubmit = async () => {
    if (!writeTitle.trim() || !writeContent.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    // ✅ 수정: selectedFarm과 farmId 확인
    if (!selectedFarm || !selectedFarm.farmId) {
      alert("선택된 농장이 없습니다.");
      return;
    }

    try {
      const response = await axios.post("/api/posts", {
        title: writeTitle.trim(),
        content: writeContent.trim(),
        authorId: userId,
        farmId: selectedFarm.farmId, // ✅ 수정
      });

      console.log("✅ userId:", userId);
      console.log("✅ farmId:", selectedFarm.farmId);

      alert("✅ 글쓰기 성공!");
      console.log("서버 응답:", response.data);

      const newPost = {
        id: response.data.id || Date.now(),
        farmId: selectedFarm.farmId, // ✅ 수정
        userNickname: userNickname || "사용자",
        authorId: userId,
        role: "회원",
        title: writeTitle.trim(),
        content: writeContent.trim(),
        tags: [],
        likes: 0,
        replies: 0,
        type: "tip",
        createdAt: new Date().toISOString(),
        image: writeImagePreview,
      };

      setLocalCommunityPosts((prev) => [newPost, ...prev]);

      setIsWriting(false);
      setWriteTitle("");
      setWriteContent("");
      setWriteImage(null);
      setWriteImagePreview(null);
      setWriteCategory("board");

    } catch (error) {
      console.error("❌ 글쓰기 실패:", error);
      console.error("응답 데이터:", error.response?.data);
      console.error("응답 상태:", error.response?.status);
      alert("글쓰기 실패: " + (error.response?.data || error.message));
    }
  };



  // 게시글 전체 조회하기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("/api/posts"); // 전체 글 조회
        setLocalCommunityPosts(response.data); // 상태에 저장
      } catch (error) {
        console.error("게시글 가져오기 실패:", error);
      }
    };

    fetchPosts();
  }, []); // 빈 배열: 컴포넌트가 처음 마운트될 때만 실행


  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const profile = await fetchMyProfile();
        setUserNickname(profile.nickname || profile.name || "사용자");
        setUserId(profile.userId || 1); // 사용자 ID 저장
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setUserNickname("사용자");
        setUserId(1); // 기본값
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

    // CommunityModal.jsx - useEffect 수정
    useEffect(() => {
      const fetchFarms = async () => {
        try {
          const response = await axios.get("/api/farms");
          console.log("✅ 농장 목록:", response.data); // 디버깅용

          if (response.data && response.data.length > 0) {
            setFarmList(response.data);
            setSelectedFarm(response.data[0]);
          } else {
            console.warn("등록된 농장이 없습니다.");
            setFarmList([]);
          }
        } catch (error) {
          console.error("❌ 농장 목록 가져오기 실패:", error);
          alert("농장 목록을 불러오는데 실패했습니다.");
          setFarmList([]);
        }
      };

      fetchFarms();
    }, []);

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
                      <strong>{selectedFarm ? selectedFarm.name : "농장 선택"}</strong>
                    </button>
                  )}
                </div>
                {isFarmDropdownOpen && (
                  <div className="farm-select-dropdown">
                    <ul>
                      {filteredFarms.length > 0 ? (
                        filteredFarms.map((farm) => (
                          <li key={farm.farmId}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFarm(farm);
                                setFarmSearch("");
                                setIsFarmDropdownOpen(false);
                              }}
                            >
                              <strong>{farm.name}</strong>
                              <span>{farm.city}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="empty">
                          <span>
                            {farmSearch
                              ? "일치하는 농장이 없습니다."
                              : "등록된 농장이 없습니다."}
                          </span>
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

                <input
                  type="text"
                  className="write-title-input"
                  placeholder="제목을 입력하세요"
                  value={writeTitle}
                  onChange={(e) => setWriteTitle(e.target.value)}
                />

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

                <textarea
                  className="write-content-textarea"
                  placeholder="내용을 입력하세요"
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                />

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
                      key={`notice-${post.id}`}
                      className="community-post notice"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        <div className="post-title-line">
                          <span className="category-chip">공지</span>
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">{post.userNickname}</span>
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
                      key={`board-${post.id}`}
                      className="community-post"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        <div className="post-title-line">
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">{post.userNickname}</span>
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
                    <div className="post-detail">
                      <h4>{selectedPost.title}</h4>
                      {selectedPost.authorId === userId && (
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
                      </div>
                      <div className="detail-meta">
                        <span className="detail-author">
                          {selectedPost.userNickname}
                        </span>
                        <span className="detail-date">
                          {formatToDateString(selectedPost.createdAt)}
                        </span>
                      </div>


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
                  <div className="detail-body">{selectedPost.content}</div>
                )}
                <div className="detail-separator" />
                <div className="detail-comments">
                  {comments[selectedPost.id] &&
                    comments[selectedPost.id].length > 0 && (
                      <div className="detail-comments-list">
                        {comments[selectedPost.id].map((comment, index) => (
                          <div key={`${comment.id}-${index}`} className="comment-wrapper">
                            <div className="detail-comment-item">
                              <div className="comment-header">
                                <strong className="comment-nickname">
                                  {comment.nickname}
                                </strong>
                                {comment.nickname === userNickname && (
                                  <div className="comment-actions">
                                    <button
                                      type="button"
                                      className="comment-action-btn"
                                      onClick={() =>
                                        handleEditComment(
                                          comment.commentId,
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
                              {editingComment === comment.commentId ? (
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

                            {comment.replies && comment.replies.length > 0 && (
                              <div className="reply-list">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={`${reply.id}-${comment.id}`}
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
