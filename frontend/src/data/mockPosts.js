// Mock 게시글 데이터 - 각 농장별 커뮤니티 게시글

export const noticePosts = [
  {
    id: "notice-1",
    farmId: 1, // 도심 속 힐링 농장
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
    farmId: 2, // 용산 체험 농장
    author: "운영팀",
    role: "커뮤니티",
    title: "농장 체험 프로그램 일정 안내",
    excerpt:
      "4월부터 매주 토요일 오전 10시에 가족 단위 농장 체험 프로그램이 진행됩니다. 사전 예약 필수입니다.",
    tags: ["공지", "체험프로그램"],
    createdAt: "2025-03-12",
  },
  {
    id: "notice-3",
    farmId: 3, // 빛고을 주말농장
    author: "관리자",
    role: "운영팀",
    title: "봄 작물 파종 일정 공지",
    excerpt:
      "3월 20일부터 봄 작물 파종을 시작합니다. 참여를 원하시는 분들은 사전 신청해 주세요.",
    tags: ["공지", "파종"],
    createdAt: "2025-03-08",
  },
  {
    id: "notice-4",
    farmId: 4, // 광산 힐링 파크
    author: "운영팀",
    role: "커뮤니티",
    title: "주말농장 분양 신청 안내",
    excerpt:
      "2025년 상반기 주말농장 분양 신청을 받습니다. 3월 31일까지 선착순으로 진행됩니다.",
    tags: ["공지", "분양"],
    createdAt: "2025-03-05",
  },
];

export const communityPosts = [
  // 도심 속 힐링 농장 (id: 1)
  {
    id: 1,
    farmId: 1,
    author: "종로농부",
    role: "텃밭 가꾸기 3년차",
    title: "도심에서 토마토 키우기 성공했어요!",
    excerpt:
      "작은 공간이지만 방울토마토를 키워서 수확했습니다. LED 조명과 적절한 물 관리가 핵심이었어요.",
    tags: ["토마토", "도심농업", "성공사례"],
    likes: 32,
    replies: 8,
    type: "tip",
    createdAt: "2025-03-14",
    image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800",
  },
  {
    id: 2,
    farmId: 1,
    author: "초보농사꾼",
    role: "처음 시작하는 초보",
    title: "상추가 시들어요, 도와주세요!",
    excerpt:
      "일주일 전에 심은 상추가 자꾸 시드는데 어떻게 해야 할까요? 물은 매일 주고 있습니다.",
    tags: ["상추", "도움요청", "초보"],
    likes: 15,
    replies: 12,
    type: "question",
    createdAt: "2025-03-13",
  },

  // 용산 체험 농장 (id: 2)
  {
    id: 3,
    farmId: 2,
    author: "용산파머",
    role: "유기농 재배 5년차",
    title: "유기농 퇴비 만들기 워크샵 후기",
    excerpt:
      "지난 주말 농장에서 진행한 퇴비 만들기 워크샵 정말 유익했어요. 집에서도 실천할 수 있을 것 같습니다.",
    tags: ["유기농", "퇴비", "워크샵"],
    likes: 41,
    replies: 6,
    type: "tip",
    createdAt: "2일 전",
  },
  {
    id: 4,
    farmId: 2,
    author: "체험러버",
    role: "가족 농장 체험 참여자",
    title: "아이들과 함께한 감자 심기 체험 후기",
    excerpt:
      "5살, 7살 아이들과 감자 심기 체험했는데 너무 좋아했어요. 다음에 수확할 때 또 올게요!",
    tags: ["체험", "가족", "감자"],
    likes: 28,
    replies: 5,
    type: "tip",
    createdAt: "3일 전",
  },
  {
    id: 5,
    farmId: 2,
    author: "친환경재배자",
    role: "무농약 재배 연구",
    title: "병해충 관리 천연 방제법 공유",
    excerpt:
      "화학 농약 대신 사용할 수 있는 천연 방제법들을 정리해봤습니다. 마늘, 고추 활용법 등 공유드려요.",
    tags: ["방제", "천연", "무농약"],
    likes: 53,
    replies: 14,
    type: "tip",
    createdAt: "4일 전",
  },

  // 빛고을 주말농장 (id: 3)
  {
    id: 6,
    farmId: 3,
    author: "광주농부",
    role: "주말농장 회원 2년차",
    title: "멀칭 작업 공동 구매 하실 분 계신가요?",
    excerpt:
      "생분해 멀칭 필름을 대량으로 구매하면 저렴한데, 같이 구매하실 분 계시면 댓글 남겨주세요!",
    tags: ["공동구매", "멀칭", "자재"],
    likes: 19,
    replies: 11,
    type: "market",
    createdAt: "1일 전",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800",
  },
  {
    id: 7,
    farmId: 3,
    author: "고추전문가",
    role: "고추 재배 10년차",
    title: "고추 모종 심는 최적 시기는?",
    excerpt:
      "광주 지역 기준으로 고추 모종 심기 좋은 시기가 언제일까요? 4월 초가 적당할까요?",
    tags: ["고추", "모종", "시기"],
    likes: 35,
    replies: 9,
    type: "question",
    createdAt: "2일 전",
  },

  // 광산 힐링 파크 (id: 4)
  {
    id: 8,
    farmId: 4,
    author: "힐링농부",
    role: "치유농업 실천가",
    title: "농사로 힐링하는 일상",
    excerpt:
      "직장 스트레스가 심했는데 주말마다 농장에서 시간을 보내니 마음이 편안해집니다. 다들 힐링하러 오세요!",
    tags: ["힐링", "일상", "치유"],
    likes: 47,
    replies: 7,
    type: "tip",
    createdAt: "6시간 전",
  },
  {
    id: 9,
    farmId: 4,
    author: "수경재배러",
    role: "수경재배 연구자",
    title: "수경재배 시스템 구축 비용 궁금해요",
    excerpt:
      "소규모로 수경재배 시스템을 만들어보고 싶은데, 대략 비용이 얼마나 드는지 경험 있으신 분 계신가요?",
    tags: ["수경재배", "비용", "시스템"],
    likes: 22,
    replies: 13,
    type: "question",
    createdAt: "1일 전",
  },
  {
    id: 10,
    farmId: 4,
    author: "허브마스터",
    role: "허브 재배 전문",
    title: "봄에 키우기 좋은 허브 추천",
    excerpt:
      "바질, 로즈마리, 민트 등 봄철에 키우기 좋은 허브들을 소개합니다. 초보자도 쉽게 키울 수 있어요!",
    tags: ["허브", "바질", "추천"],
    likes: 38,
    replies: 6,
    type: "tip",
    createdAt: "3일 전",
  },
];
