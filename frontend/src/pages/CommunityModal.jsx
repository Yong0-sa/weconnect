import { useEffect, useMemo, useRef, useState } from "react";
import "./CommunityModal.css";

const farmCommunities = [
  { id: "farm-seoul-01", name: "서울 도시농장", location: "서울특별시 강서구" },
  { id: "farm-seoul-02", name: "한강 리버팜", location: "서울특별시 마포구" },
  { id: "farm-gg-01", name: "경기 그린밸리", location: "경기도 고양시" },
  { id: "farm-gg-02", name: "평택 스마트팜", location: "경기도 평택시" },
  { id: "farm-bs-01", name: "부산 해풍농장", location: "부산광역시 기장군" },
  { id: "farm-dj-01", name: "대전 아쿠아팜", location: "대전광역시 유성구" },
];

const noticePosts = [
  {
    id: "notice-1",
    author: "관리자",
    role: "운영팀",
    title: "3월 정기 점검 안내",
    excerpt:
      "3월 28일(금) 02:00~04:00 사이 서비스 정기 점검이 예정되어 있습니다. 점검 시간에는 커뮤니티 글 작성이 제한됩니다.",
    tags: ["공지", "점검"],
    createdAt: "2025-03-14",
  },
  {
    id: "notice-2",
    author: "운영팀",
    role: "커뮤니티",
    title: "농장 등록 정보 갱신 요청",
    excerpt:
      "각 농장 관리자께서는 3월 말까지 운영 시간과 체험 프로그램 정보를 최신으로 갱신해 주세요.",
    tags: ["공지", "농장정보"],
    createdAt: "2025-03-10",
  },
];

const communityPosts = [
  {
    id: 1,
    author: "그로워 토끼",
    role: "토마토 재배 6년차",
    title: "봄철 일조량이 부족할 때 LED를 켤까 말까 고민입니다.",
    excerpt:
      "3월 초인데도 흐린 날이 계속되네요. LED 보조조명을 켜자니 전기요금이 부담이고, 안 켜자니 생육이 느려집니다. 다들 기준을 어떻게 잡으세요?",
    tags: ["토마토", "보조조명", "생육관리"],
    likes: 64,
    replies: 12,
    type: "question",
    createdAt: "2시간 전",
  },
  {
    id: 2,
    author: "수경재배연구소",
    role: "양액·배양 기술자",
    title: "양액 EC 2.5 유지 팁 공유합니다",
    excerpt:
      "겨울철에는 EC가 널뛰기 쉬운데, 배양수 온도와 믹싱 순서를 이렇게 조절하니 안정적으로 유지되더라고요. 상세 레시피 첨부했어요.",
    tags: ["양액", "EC", "수경재배"],
    likes: 48,
    replies: 8,
    type: "tip",
    createdAt: "어제",
  },
  {
    id: 3,
    author: "주말농부_민수",
    role: "체험 농장 운영",
    title: "4월 공동 구매 멀칭 필름 수요 조사",
    excerpt:
      "40cm 폭 생분해 멀칭 필름을 최소 주문 수량 맞춰서 공동 구매하려고 합니다. 필요한 분 댓글 달아주세요!",
    tags: ["공동구매", "자재", "커뮤니티"],
    likes: 27,
    replies: 19,
    type: "market",
    createdAt: "3일 전",
  },
];

function CommunityModal({ onClose }) {
  const [search, setSearch] = useState("");
  const [selectedFarm, setSelectedFarm] = useState(farmCommunities[0]);
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);
  const [farmSearch, setFarmSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const dropdownRef = useRef(null);

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
  }, [search]);

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
  }, [search]);

  const filteredFarms = useMemo(() => {
    if (!farmSearch.trim()) return farmCommunities;
    return farmCommunities.filter((farm) =>
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
  };

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
          <p className="community-subtitle">
            농장별 소식을 한 곳에서 확인하세요
          </p>
        </div>
      </header>

      <section className="community-body">
        <aside className="community-sidebar">
          <div className="community-panel combined-panel">
            <div className="panel-block">
              <p className="panel-title">커뮤니티 선택</p>
              <div className="community-farm-select" ref={dropdownRef}>
                <button
                  type="button"
                  className="farm-select-trigger"
                  onClick={() => setIsFarmDropdownOpen((prev) => !prev)}
                >
                  <span className="label">농장 지정</span>
                  <strong>{selectedFarm.name}</strong>
                  <span className="location">{selectedFarm.location}</span>
                </button>
                {isFarmDropdownOpen && (
                  <div className="farm-select-dropdown">
                    <input
                      type="text"
                      placeholder="농장 검색"
                      value={farmSearch}
                      onChange={(event) => setFarmSearch(event.target.value)}
                    />
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
                  onClick={() => setActiveCategory("all")}
                >
                  전체글보기
                </button>
                <button
                  type="button"
                  className={activeCategory === "notice" ? "active" : ""}
                  onClick={() => setActiveCategory("notice")}
                >
                  공지사항
                </button>
                <button
                  type="button"
                  className={activeCategory === "board" ? "active" : ""}
                  onClick={() => setActiveCategory("board")}
                >
                  자유게시판
                </button>
              </div>
            </div>
            <div className="panel-block">
              <p className="panel-title">키워드 검색</p>
              <form
                className="community-search-panel"
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  type="text"
                  placeholder="검색어 입력"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button type="submit">검색</button>
              </form>
            </div>
          </div>
        </aside>
        <div className="community-feed">
          <div className="community-feed-card">
            {!selectedPost ? (
              <div className="community-feed-content">
                <h3 className="section-title">전체 글 보기</h3>
                <div className="section-header">
                  <span>{totalCount}건</span>
                </div>

                {showNotice &&
                  filteredNoticePosts.map((post) => (
                    <article
                      key={post.id}
                      className="community-post notice"
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="post-title-line">
                        <span className="category-chip">공지</span>
                        <h3>{post.title}</h3>
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
                      <div className="post-title-line">
                        <h3>{post.title}</h3>
                      </div>
                    </article>
                  ))}

                {showBoard && filteredBoardPosts.length === 0 && (
                  <div className="community-empty small">
                    <p>조건에 맞는 글이 없습니다.</p>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => setSearch("")}
                    >
                      검색 초기화
                    </button>
                  </div>
                )}

                {showBoard && (
                  <button type="button" className="community-write-fab">
                    글쓰기
                  </button>
                )}
              </div>
            ) : (
              <div className="community-detail-panel">
                <div className="detail-header">
                  <div>
                    <p className="detail-meta">
                      {selectedPost.createdAt} · {selectedPost.author}
                    </p>
                    <h4>{selectedPost.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    aria-label="상세 닫기"
                  >
                    목록
                  </button>
                </div>
                <p className="detail-body">{selectedPost.excerpt}</p>
                {selectedPost.tags?.length > 0 && (
                  <div className="detail-tags">
                    {selectedPost.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CommunityModal;
