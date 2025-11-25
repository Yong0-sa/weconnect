import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./CommunityModal.css";
import { fetchMyProfile } from "../api/profile";
import { useCoins } from "../contexts/CoinContext";
import { getTextSuggestions } from "../api/textSuggestions";

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
  const { addCoins } = useCoins();
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
  const [editingPostData, setEditingPostData] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writeImage, setWriteImage] = useState(null);
  const [writeImagePreview, setWriteImagePreview] = useState(null);
  const [writeCategory, setWriteCategory] = useState("board");
  const [localCommunityPosts, setLocalCommunityPosts] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [myFarmId, setMyFarmId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);
  const [scale, setScale] = useState(1);

  // AI 문장 추천 관련 state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const writeContentRef = useRef(null);
  const farmSearchInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const generateUniqueId = () => Date.now() + Math.random();

  const canEditSelectedPost =
    selectedPost &&
    (selectedPost.type === "NOTICE"
      ? isOwner
      : selectedPost.authorId === userId);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const applyFarmSelection = useCallback((farm, options = {}) => {
    if (!farm) return;
    if (options.manual) {
      setHasManualSelection(true);
    } else {
      setHasManualSelection(false);
    }
    setSelectedFarm(farm);
    setSelectedPost(null);
    setIsWriting(false);
    setEditingPostData(null);
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);
    setWriteCategory("board");
    setActiveCategory("all");
  }, []);

  const handleGoToMyFarm = useCallback(() => {
    if (!myFarmId) return;
    const matched = farmList.find(
      (farm) => String(farm.farmId) === String(myFarmId)
    );
    if (matched) {
      applyFarmSelection(matched);
    }
  }, [myFarmId, farmList, applyFarmSelection]);

  // 선택된 농장의 게시글만 필터링
  const noticePosts = useMemo(() => {
    if (!selectedFarm || !selectedFarm.farmId) return [];
    return localCommunityPosts.filter(
      (post) => post.farmId === selectedFarm.farmId && post.type === "NOTICE"
    );
  }, [selectedFarm, localCommunityPosts]);

  const communityPosts = useMemo(() => {
    if (!selectedFarm || !selectedFarm.farmId) return [];
    return localCommunityPosts.filter(
      (post) => post.farmId === selectedFarm.farmId && post.type === "GENERAL"
    );
  }, [selectedFarm, localCommunityPosts]);

  const filteredBoardPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      return (
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.content.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, communityPosts]);

  const filteredNoticePosts = useMemo(() => {
    return noticePosts.filter((post) => {
      return (
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.content.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, noticePosts]);

  const filteredFarms = useMemo(() => {
    if (!farmSearch.trim()) return farmList;
    return farmList.filter((farm) =>
      farm.name.toLowerCase().includes(farmSearch.toLowerCase())
    );
  }, [farmSearch, farmList]);

  const hasNoticePosts = filteredNoticePosts.length > 0;
  const hasBoardPosts = filteredBoardPosts.length > 0;
  const isOwnerRole = userRole === "FARMER" || userRole === "ADMIN";
  const hasSelectedFarm = Boolean(selectedFarm);
  const showNotice = activeCategory === "all" || activeCategory === "notice";
  const showBoard = activeCategory === "all" || activeCategory === "board";
  const totalCount =
    (showNotice ? filteredNoticePosts.length : 0) +
    (showBoard ? filteredBoardPosts.length : 0);
  const isEditingPost = Boolean(editingPostData);

  const handlePostClick = async (post) => {
    setSelectedPost(post);
    setCommentInput("");
    setIsWriting(false);
    setEditingPostData(null);
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);

    try {
      const response = await axios.get(`/api/comments?postId=${post.id}`);

      const commentsWithReplies = response.data.map((comment) => ({
        ...comment,
        replies: comment.replies || [], // replies 배열이 없으면 빈 배열로 초기화
      }));

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

    try {
      const response = await axios.post("/api/comments", {
        postId: selectedPost.id,
        authorId: userId,
        content: commentInput.trim(),
      });
      console.log(selectedPost.id, userId, commentInput.trim());

      console.log(response.data);

      const newComment = { ...response.data, replies: [] };

      setComments((prev) => ({
        ...prev,
        [selectedPost.id]: [...(prev[selectedPost.id] || []), newComment],
      }));

      setCommentInput("");
    } catch (error) {
      console.error("댓글 등록 실패:", error);
    }
  };

  const handleReplyClick = (commentId) => {
    setReplyingTo(commentId);
    setReplyInput("");
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyInput("");
  };

  const handleReplySubmit = async (commentId) => {
    if (!replyInput.trim() || !selectedPost) return;

    try {
      const response = await axios.post("/api/replies", {
        commentId: commentId,
        authorId: userId,
        content: replyInput.trim(),
      });
      const newReply = response.data;

      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];
        const updatedComments = postComments.map((comment) => {
          if (comment.commentId === commentId) {
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
    } catch (error) {
      console.error("답글 등록 실패:", error);
    }
  };

  // 게시글 수정 시작
  const handleEditPost = () => {
    if (!selectedPost) return;
    setEditingPostData(selectedPost);
    setIsWriting(true);
    setWriteTitle(selectedPost.title || "");
    setWriteContent(selectedPost.content || "");
    setWriteCategory(selectedPost.type === "NOTICE" ? "notice" : "board");
    setWriteImage(null);
    setWriteImagePreview(selectedPost.image || selectedPost.photoUrl || null);
  };

  const confirmDelete = async (message) =>
    new Promise((resolve) => {
      setToast({
        type: "confirm",
        message,
        onConfirm: () => {
          setToast(null);
          resolve(true);
        },
        onCancel: () => {
          setToast(null);
          resolve(false);
        },
      });
    });

  const handleDeletePost = async () => {
    const confirmed = await confirmDelete("게시글을 삭제하시겠습니까?");
    if (!confirmed) {
      setToast(null);
      return;
    }

    try {
      await axios.delete(`/api/posts/${selectedPost.id}?requesterId=${userId}`);

      setLocalCommunityPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== selectedPost.id)
      );
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[selectedPost.id];
        return newComments;
      });
      setSelectedPost(null);
      showToast("게시글이 삭제되었습니다.", "success");
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      const msg = error.response?.data || error.message || "삭제 실패";
      showToast(msg, "error");
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
      if (parentId) {
        await axios.put(`/api/replies/${commentId}?requesterId=${userId}`, {
          content: editCommentContent,
        });
      } else {
        await axios.put(`/api/comments/${commentId}?requesterId=${userId}`, {
          content: editCommentContent,
        });
      }
      // 2. 요청 성공 시 로컬 상태 업데이트
      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];

        if (parentId) {
          const updatedComments = postComments.map((comment) => {
            if (comment.commentId === parentId) {
              return {
                ...comment,
                replies: comment.replies.map((reply) =>
                  reply.replyId === commentId
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
            comment.commentId === commentId
              ? { ...comment, content: editCommentContent.trim() }
              : comment
          );

          return { ...prev, [selectedPost.id]: updatedComments };
        }
      });

      setEditingComment(null);
      setEditCommentContent("");
    } catch (error) {
      console.error("수정 실패:", error);
    }
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditCommentContent("");
  };

  // 댓글, 답글 삭제 함수
  const handleDeleteComment = async (commentId, parentId = null) => {
    const message = "댓글을 삭제하시겠습니까?";
    const confirmed = await confirmDelete(message);
    if (!confirmed) {
      setToast(null);
      return;
    }

    try {
      if (parentId) {
        await axios.delete(`/api/replies/${commentId}?requesterId=${userId}`);
      } else {
        await axios.delete(`/api/comments/${commentId}?requesterId=${userId}`);
      }

      setComments((prev) => {
        const postComments = prev[selectedPost.id] || [];

        if (parentId) {
          const updatedComments = postComments.map((comment) => {
            if (comment.commentId === parentId) {
              return {
                ...comment,
                replies: comment.replies.filter(
                  (reply) => reply.replyId !== commentId
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
          // 댓글 삭제
          const updatedComments = postComments.filter(
            (comment) => comment.commentId !== commentId
          );

          return {
            ...prev,
            [selectedPost.id]: updatedComments,
          };
        }
      });
      showToast("삭제되었습니다.", "success");
    } catch (error) {
      console.error("삭제 실패:", error);
      const msg = error.response?.data || error.message || "삭제 실패";
      showToast(msg, "error");
    }
  };

  // 글쓰기 기능
  const handleWriteClick = () => {
    setEditingPostData(null);
    setIsWriting(true);
    setWriteTitle("");
    setWriteContent("");
    setWriteImage(null);
    setWriteImagePreview(null);
    // 공지사항 탭에서 클릭했으면 notice, 아니면 board
    setWriteCategory(activeCategory === "notice" ? "notice" : "board");
  };

  const handleWriteCancel = () => {
    setIsWriting(false);
    setEditingPostData(null);
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

  // AI 문장 추천 요청
  const handleRequestSuggestions = async () => {
    console.log("=== 문장 추천 버튼 클릭 ===");
    console.log("writeContent:", writeContent);
    console.log("selectedFarm:", selectedFarm);
    console.log("farmId:", selectedFarm?.farmId);

    if (!writeContent.trim() || !selectedFarm?.farmId) {
      console.log("조건 불충족으로 중단");
      return;
    }

    console.log("API 호출 시작");
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    setShowSuggestions(false);

    try {
      const data = await getTextSuggestions(writeContent.trim(), selectedFarm.farmId);
      console.log("API 응답:", data);
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("문장 추천 실패:", error);
      showToast("문장 추천에 실패했습니다. 다시 시도해주세요.", "error");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // 추천 문장 선택 시 커서 위치에 삽입
  const handleSelectSuggestion = (suggestion) => {
    if (!suggestion.trim()) return;

    const textarea = writeContentRef.current;
    if (!textarea) {
      // ref가 없으면 맨 뒤에 추가
      setWriteContent((prev) => prev + " " + suggestion);
      setShowSuggestions(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = writeContent;

    // 커서 위치에 문장 삽입
    const newContent =
      currentContent.substring(0, start) +
      " " +
      suggestion +
      currentContent.substring(end);

    setWriteContent(newContent);
    setShowSuggestions(false);

    // 커서 위치 업데이트 (삽입된 문장 뒤로)
    setTimeout(() => {
      const newCursorPos = start + suggestion.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // ✅ 백엔드 API 연동 - 글쓰기 제출 (JSON만 전송)
  const handleWriteSubmit = async () => {
    if (!writeTitle.trim() || !writeContent.trim()) {
      return;
    }

    // 프론트엔드 권한 검증 추가
    if (writeCategory === "notice" && !isOwner) {
      showToast("공지사항은 농장주만 작성할 수 있습니다.", "error");
      return;
    }

    if (editingPostData) {
      try {
        await axios.put(
          `/api/posts/${editingPostData.id}?requesterId=${userId}`,
          {
            title: writeTitle.trim(),
            content: writeContent.trim(),
          }
        );

        setLocalCommunityPosts((prev) =>
          prev.map((post) =>
            post.id === editingPostData.id
              ? {
                  ...post,
                  title: writeTitle.trim(),
                  content: writeContent.trim(),
                }
              : post
          )
        );
        setSelectedPost((prev) =>
          prev && prev.id === editingPostData.id
            ? {
                ...prev,
                title: writeTitle.trim(),
                content: writeContent.trim(),
              }
            : prev
        );
        showToast("게시글이 수정되었습니다.", "success");
      } catch (error) {
        console.error("글 수정 실패:", error);
        showToast(
          error.response?.data || error.message || "글 수정 실패",
          "error"
        );
        return;
      } finally {
        setIsWriting(false);
        setEditingPostData(null);
        setWriteTitle("");
        setWriteContent("");
        setWriteImage(null);
        setWriteImagePreview(null);
        setWriteCategory("board");
      }
      return;
    }

    if (!selectedFarm || !selectedFarm.farmId) {
      return;
    }

    try {
      const formData = new FormData();
      const payload = {
        title: writeTitle.trim(),
        content: writeContent.trim(),
        authorId: userId,
        farmId: selectedFarm.farmId,
        type: writeCategory === "notice" ? "NOTICE" : "GENERAL",
      };
      formData.append(
        "post",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
      if (writeImage) {
        formData.append("image", writeImage);
      }
      const response = await axios.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = response.data.photoUrl || writeImagePreview || null;
      const newPost = {
        id: response.data.id || Date.now(),
        farmId: selectedFarm.farmId,
        userNickname: userNickname || "사용자",
        authorId: userId,
        role: "회원",
        title: writeTitle.trim(),
        content: writeContent.trim(),
        tags: [],
        likes: 0,
        replies: 0,
        type: response.data.type || "GENERAL",
        createdAt: new Date().toISOString(),
        image: imageUrl,
        photoUrl: imageUrl,
      };

      setLocalCommunityPosts((prev) => [newPost, ...prev]);

      addCoins(1);
      showToast("게시글이 저장되었습니다! 코인 1개 적립!", "success");

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
      showToast(
        error.response?.data || error.message || "글쓰기 실패",
        "error"
      );
    }
  };

  // 게시글 전체 조회하기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("/api/posts"); // 전체 글 조회
        const mapped = (response.data || [])
          .map((post) => ({
            ...post,
            image: post.photoUrl || post.image || null,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
        setLocalCommunityPosts(mapped); // 상태에 저장
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
        setUserId(profile.userId || 1);
        setMyFarmId(profile.farmId ?? null);
        setUserRole(profile.role || null);
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setUserNickname("사용자");
        setUserId(1);
        setMyFarmId(null);
        setUserRole(null);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (!selectedPost) {
      setIsWriting(false);
      setEditingPostData(null);
      setWriteTitle("");
      setWriteContent("");
      setWriteImage(null);
      setWriteImagePreview(null);
    }
    if (
      selectedFarm &&
      selectedPost &&
      selectedPost.farmId !== selectedFarm.farmId
    ) {
      setSelectedPost(null);
    }
  }, [selectedPost, selectedFarm]);

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

  // 모달 크기 자동 조정 (무한축소)
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateScale = () => {
      const baseWidth = 1920;
      const baseHeight = 1080;
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

  // 농장 목록 조회
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await axios.get("/api/farms");
        console.log("✅ 농장 목록:", response.data);

        if (response.data && response.data.length > 0) {
          setFarmList(response.data);
        } else {
          console.warn("등록된 농장이 없습니다.");
          setFarmList([]);
          setSelectedFarm(null);
        }
      } catch (error) {
        console.error("❌ 농장 목록 가져오기 실패:", error);
        setFarmList([]);
        setSelectedFarm(null);
      }
    };

    fetchFarms();
  }, []);

  // 농장주라면 자신의 농장을 우선 선택
  useEffect(() => {
    if (!farmList.length) return;

    if (!hasManualSelection && myFarmId) {
      const matched = farmList.find(
        (farm) => String(farm.farmId) === String(myFarmId)
      );
      if (matched) {
        if (!selectedFarm || selectedFarm.farmId !== matched.farmId) {
          applyFarmSelection(matched);
        }
        return;
      }
    }

    if (
      hasManualSelection &&
      selectedFarm &&
      !farmList.some((farm) => farm.farmId === selectedFarm.farmId)
    ) {
      setHasManualSelection(false);
      setSelectedFarm(null);
    }
  }, [
    farmList,
    myFarmId,
    selectedFarm,
    hasManualSelection,
    isOwnerRole,
    applyFarmSelection,
  ]);

  // 농장 선택 시 권한 확인
  useEffect(() => {
    if (!selectedFarm || !selectedFarm.farmId) {
      setIsOwner(false);
      setIsApproved(false);
      return;
    }

    const checkPermissions = async () => {
      try {
        const response = await axios.get(
          `/api/farms/${selectedFarm.farmId}/check-approval`
        );
        console.log("✅ 권한 확인 결과:", response.data);
        console.log("   farmId:", selectedFarm.farmId);
        console.log("   isOwner:", response.data.isOwner);
        console.log("   isApproved:", response.data.isApproved);
        setIsOwner(response.data.isOwner || false);
        setIsApproved(response.data.isApproved || false);
      } catch (error) {
        console.error("❌ 권한 확인 실패:", error);
        setIsOwner(false);
        setIsApproved(false);
      }
    };

    checkPermissions();
  }, [selectedFarm]);

  useEffect(() => {
    if (isFarmDropdownOpen && farmSearchInputRef.current) {
      farmSearchInputRef.current.focus();
    }
  }, [isFarmDropdownOpen]);

  return (
    <div className="community-modal-card" style={{ transform: `scale(${scale})` }}>
      {toast && (
        <div className={`community-toast community-toast--${toast.type}`}>
          <span>{toast.message}</span>
          {toast.type === "confirm" && (
            <div className="community-toast-actions">
              <button type="button" onClick={toast.onCancel}>
                취소
              </button>
              <button
                type="button"
                className="danger"
                onClick={toast.onConfirm}
              >
                삭제
              </button>
            </div>
          )}
        </div>
      )}
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
              <div className="farm-select-header">
                <p className="panel-title">농장 선택</p>
                {myFarmId && (
                  <button
                    type="button"
                    className="my-farm-button"
                    onClick={handleGoToMyFarm}
                    disabled={
                      !farmList.some(
                        (farm) => String(farm.farmId) === String(myFarmId)
                      )
                    }
                  >
                    내 농장
                  </button>
                )}
              </div>
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
                      <strong>
                        {selectedFarm ? selectedFarm.name : "농장 선택"}
                      </strong>
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
                                applyFarmSelection(farm, { manual: true });
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
            {hasSelectedFarm && (
              <>
                <div className="panel-block">
                  <p className="panel-title">카테고리</p>
                  <div className="category-buttons">
                    <button
                      type="button"
                      className={activeCategory === "all" ? "active" : ""}
                      onClick={() => {
                        if (isWriting) {
                          handleWriteCancel();
                        }
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
                        if (isWriting) {
                          handleWriteCancel();
                        }
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
                        if (isWriting) {
                          handleWriteCancel();
                        }
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
                  <form
                    className="community-search-panel"
                    onSubmit={handleSearch}
                  >
                    <input
                      type="text"
                      placeholder="검색어 입력"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                    <button type="submit">검색</button>
                  </form>
                </div>
              </>
            )}
          </div>
        </aside>
        <div className="community-feed">
          <div className="community-feed-card">
            {!hasSelectedFarm ? (
              <div className="community-empty large">
                <p>농장을 선택해주세요.</p>
                <span>
                  {isOwnerRole
                    ? "왼쪽에서 농장을 선택하거나 농장 정보를 등록해주세요."
                    : "왼쪽에서 농장을 선택하거나 신청하신 농장의 승인을 기다려 주세요."}
                </span>
              </div>
            ) : isWriting ? (
              <div className="community-detail-panel">
                <div className="write-header">
                  <p className="write-mode-label">
                    {isEditingPost ? "게시글 수정" : "새 글 작성"}
                  </p>
                  <select
                    id="write-category-select"
                    className="write-category-select"
                    value={writeCategory}
                    onChange={(e) => setWriteCategory(e.target.value)}
                    disabled={isEditingPost}
                  >
                    {isOwner && <option value="notice">공지사항</option>}
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

                {/* AI 문장 추천 영역 (이미지와 textarea 사이, 조건부) */}
                {writeCategory === "notice" &&
                  isOwner &&
                  writeContent.length >= 10 && (
                    <div className="ai-suggestion-area">
                      <button
                        type="button"
                        className="ai-suggestion-btn"
                        onClick={handleRequestSuggestions}
                        disabled={isLoadingSuggestions}
                      >
                        {isLoadingSuggestions ? "추천 중..." : "문장 추천"}
                      </button>

                      {/* 추천 문장 버블 */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="ai-suggestion-bubbles">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="ai-suggestion-bubble"
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                <textarea
                  ref={writeContentRef}
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
                    {isEditingPost ? "수정" : "등록"}
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
                  <button
                    type="button"
                    className="community-write-btn"
                    onClick={handleWriteClick}
                    disabled={
                      activeCategory === "notice"
                        ? !isOwner
                        : !isOwner && !isApproved
                    }
                    title={
                      activeCategory === "notice" && !isOwner
                        ? "공지사항은 농장주만 작성할 수 있습니다"
                        : !isOwner && !isApproved
                        ? "승인된 회원만 글을 작성할 수 있습니다"
                        : ""
                    }
                  >
                    글쓰기
                  </button>
                </div>
                {showNotice &&
                  filteredNoticePosts.map((post) => (
                    <article
                      key={`notice-${post.id}`}
                      className="community-post notice"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        {post.image && (
                          <div className="community-post-thumb">
                            <img src={post.image} alt={post.title} />
                          </div>
                        )}
                        <div className="post-title-line">
                          <span className="category-chip">공지</span>
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">
                            {post.userNickname}
                          </span>
                          <span className="post-date">
                            {formatToDateString(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                {showBoard &&
                  filteredBoardPosts.map((post) => (
                    <article
                      key={`board-${post.id}`}
                      className="community-post"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-content-row">
                        {post.image && (
                          <div className="community-post-thumb">
                            <img src={post.image} alt={post.title} />
                          </div>
                        )}
                        <div className="post-title-line">
                          <h3>{post.title}</h3>
                        </div>
                        <div className="post-meta-info">
                          <span className="post-author">
                            {post.userNickname}
                          </span>
                          <span className="post-date">
                            {formatToDateString(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                {((showNotice && !hasNoticePosts) ||
                  (showBoard && !hasBoardPosts)) &&
                  !hasNoticePosts &&
                  !hasBoardPosts && (
                    <div className="community-empty small">
                      <p>게시글이 없습니다.</p>
                    </div>
                  )}
                {showBoard &&
                  !hasBoardPosts &&
                  hasNoticePosts &&
                  showNotice && (
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
                  <div className="post-detail">
                    <h4>{selectedPost.title}</h4>
                    {canEditSelectedPost && (
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
                </div>{" "}
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
                <div className="detail-body">{selectedPost.content}</div>
                <div className="detail-separator" />
                <div className="detail-comments">
                  {comments[selectedPost.id] &&
                    comments[selectedPost.id].length > 0 && (
                      <div className="detail-comments-list">
                        {comments[selectedPost.id].map((comment, index) => (
                          <div
                            key={`${comment.id}-${index}`}
                            className="comment-wrapper"
                          >
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
                                        handleDeleteComment(comment.commentId)
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
                                        handleSaveComment(comment.commentId)
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
                                    {(isOwner || isApproved) && (
                                      <button
                                        type="button"
                                        className="comment-reply-btn"
                                        onClick={() =>
                                          handleReplyClick(comment.commentId)
                                        }
                                      >
                                        답글
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {comment.replies && comment.replies.length > 0 && (
                              <div className="reply-list">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={`${reply.replyId}`}
                                    className="detail-comment-item reply-item"
                                  >
                                    <div className="comment-header">
                                      <strong className="comment-author">
                                        {reply.nickname}
                                      </strong>
                                      {reply.authorId === userId && (
                                        <div className="comment-actions">
                                          <button
                                            type="button"
                                            className="comment-action-btn"
                                            onClick={() =>
                                              handleEditComment(
                                                reply.replyId,
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
                                                reply.replyId,
                                                comment.commentId
                                              )
                                            }
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingComment === reply.replyId ? (
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
                                                reply.replyId,
                                                comment.commentId
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

                            {replyingTo === comment.commentId && (
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
                                        handleReplySubmit(comment.commentId)
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
                      placeholder={
                        !isOwner && !isApproved
                          ? "승인된 회원만 댓글을 작성할 수 있습니다"
                          : "댓글을 입력하세요"
                      }
                      onChange={(event) => setCommentInput(event.target.value)}
                      disabled={!isOwner && !isApproved}
                    />
                    <button
                      type="button"
                      className="detail-comment-submit"
                      onClick={handleCommentSubmit}
                      disabled={!isOwner && !isApproved}
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
