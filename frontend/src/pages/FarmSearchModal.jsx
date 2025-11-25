import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./FarmSearchModal.css";
import { fetchFarms } from "../api/farm";
import { applyToFarm } from "../api/farmContracts";
import { regionOptions } from "../data/farms";

const DEFAULT_MAP_LEVEL = 3; // 약 100m 축척에 해당하는 카카오맵 레벨

function FarmSearchModal({ onClose, onChatRequest }) {
  // 📌 검색/필터/선택 관련 상태
  const [selectedSido, setSelectedSido] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [applyingFarmId, setApplyingFarmId] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

  // 📌 농장 데이터 / 로딩 / 오류
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 📌 지도 관련 상태/참조
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const listContainerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 📌 지도 중심을 특정 농장 좌표로 이동
  const focusMapOnFarm = useCallback((farm) => {
    if (!window.kakao?.maps || !mapRef.current) {
      return;
    }
    const targetPosition = new window.kakao.maps.LatLng(farm.lat, farm.lng);
    mapRef.current.setLevel(DEFAULT_MAP_LEVEL, { animate: true });
    mapRef.current.panTo(targetPosition);
  }, []);

  // ============================================================
  // 📌 농장 카드 클릭 → 지도 포커스 + 선택 농장 변경
  //   (카드 내부 버튼 클릭은 무시)
  // ============================================================
  const handleFarmCardClick = useCallback(
    (farm, event) => {
      if (event?.target?.closest("button")) {
        return;
      }
      setSelectedFarmId(farm.id);
      focusMapOnFarm(farm);
    },
    [focusMapOnFarm]
  );

  const handleApplyFarm = useCallback(
    async (farm) => {
      if (!farm) return;
      const farmId = farm.farmId ?? farm.id;
      if (applyingFarmId) {
        setStatusModal({
          title: "신청 중입니다",
          message: "신청을 처리하고 있어요. 잠시만 기다려 주세요.",
        });
        return;
      }
      if (!farmId) {
        setStatusModal({
          title: "신청 실패",
          message: "농장 정보를 찾을 수 없습니다.",
        });
        return;
      }
      try {
        setApplyingFarmId(farm.id);
        await applyToFarm(farmId);
        setStatusModal({
          title: "신청 완료",
          message:
            "신청이 접수되었습니다. 승인 여부는 회원 정보 관리에서 확인해 주세요.",
        });
      } catch (error) {
        const message = error?.message || "신청을 완료하지 못했습니다.";
        if (message.includes("이미 신청 내역이 있습니다.")) {
          setStatusModal({
            title: "신청 제한",
            message: "해당 농장에 이미 신청하셨습니다.",
          });
        } else {
          setStatusModal({
            title: "신청 실패",
            message,
          });
        }
      } finally {
        setApplyingFarmId(null);
      }
    },
    [applyingFarmId]
  );

  // ============================================================
  // 📌 검색 + 시/도 필터링
  // ============================================================
  const filteredFarms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const source = farms;

    // 키워드 우선
    if (keyword) {
      return source.filter(
        (farm) =>
          farm.name.toLowerCase().includes(keyword) ||
          farm.address.toLowerCase().includes(keyword)
      );
    }

    // 시/도 필터 없으면 전체 표시
    if (!selectedSido) {
      return source;
    }

    // 시/도 prefix 매칭
    const prefix = selectedSido.slice(0, 2);
    return source.filter(
      (farm) =>
        farm.address.startsWith(prefix) ||
        farm.address.includes(selectedSido) ||
        farm.name.includes(prefix)
    );
  }, [farms, selectedSido, searchTerm]);

  // ============================================================
  // 📌 농장 불러오기 (초기 1회)
  //   - 응답을 화면에서 쓰기 좋은 형태로 정규화
  // ============================================================
  useEffect(() => {
    let active = true;

    async function loadFarms() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchFarms();
        if (!active) return;

        // 서버 데이터를 UI용 포맷으로 변환
        const normalized = (data || []).map((farm) => ({
          id: farm.farmId ?? farm.id,
          farmId: farm.farmId ?? farm.id,
          ownerId: farm.ownerId ?? farm.owner?.userId ?? null,
          name: farm.name ?? "이름 미정",
          address: farm.address ?? "",
          city: farm.city ?? "",
          phone: farm.tel || "연락처 준비 중",
          lat: Number(farm.latitude ?? 0),
          lng: Number(farm.longitude ?? 0),
        }));

        setFarms(normalized);
      } catch (err) {
        if (active) {
          setError(err.message || "농장 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadFarms();

    return () => {
      active = false;
    };
  }, []);

  // ============================================================
  // 📌 모달 크기 자동 조정 (무한축소)
  // ============================================================
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

  // ============================================================
  // 📌 필터 변경 시, 선택된 농장이 목록에 없으면 선택 해제
  // ============================================================
  useEffect(() => {
    if (selectedFarmId == null) {
      return;
    }
    if (!filteredFarms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(null);
    }
  }, [filteredFarms, selectedFarmId]);

  // ============================================================
  // 📌 카카오 지도 스크립트 동적 로드
  //   - 이미 로드된 경우 로딩만 호출
  // ============================================================
  useEffect(() => {
    const existingScript = document.getElementById("kakao-map-sdk");
    if (existingScript) {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setIsMapReady(true));
      } else {
        const handleLoad = () =>
          window.kakao.maps.load(() => setIsMapReady(true));
        existingScript.addEventListener("load", handleLoad, { once: true });
      }
      return;
    }

    // 신규 로드
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${
      import.meta.env.VITE_KAKAO_MAP_API_KEY
    }&autoload=false&libraries=services`;

    script.onload = () => {
      window.kakao.maps.load(() => setIsMapReady(true));
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  // ============================================================
  // 📌 지도 초기화 + 마커 갱신
  //   - farms 필터링 변화 시마다 재계산
  // ============================================================
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || !window.kakao?.maps) {
      return;
    }

    // 1) 최초 지도 생성
    if (!mapRef.current) {
      mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: DEFAULT_MAP_LEVEL,
      });
    }

    // 2) 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!filteredFarms.length) return;

    // 마커 이미지 생성 함수
    const createMarkerImage = (color) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 24 32" fill="none"><path d="M12 32s9-10.059 9-17.333C21 6.477 16.97 2 12 2S3 6.477 3 14.667C3 21.941 12 32 12 32z" fill="${color}"/><circle cx="12" cy="14" r="4" fill="#fff"/></svg>`;
      const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      return new window.kakao.maps.MarkerImage(
        src,
        new window.kakao.maps.Size(34, 44),
        { offset: new window.kakao.maps.Point(17, 44) }
      );
    };

    const blueMarkerImage = createMarkerImage("#2F7BFF");
    const redMarkerImage = createMarkerImage("#FF4F5E");

    const bounds = new window.kakao.maps.LatLngBounds();

    // 3) 마커 생성 & 지도에 표시
    filteredFarms.forEach((farm) => {
      const position = new window.kakao.maps.LatLng(farm.lat, farm.lng);
      const isSelected = farm.id === selectedFarmId;

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapRef.current,
        image: isSelected ? redMarkerImage : blueMarkerImage,
        zIndex: isSelected ? 2 : 1,
      });

      // 마커 클릭 시 선택 + 지도 이동
      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelectedFarmId(farm.id);
        focusMapOnFarm(farm);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // 4) 선택된 농장이 없으면 전체 영역 맞추기
    if (!bounds.isEmpty() && selectedFarmId == null) {
      mapRef.current.setBounds(bounds, 60, 60, 60, 60);
    }
  }, [filteredFarms, isMapReady, selectedFarmId, focusMapOnFarm]);

  // ============================================================
  // 📌 unmount 시 마커 정리
  // ============================================================
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  return (
    <>
      <div
        className="farm-modal-shell"
        style={{ transform: `scale(${scale})` }}
      >
        {onClose && (
          <button
            type="button"
            className="farm-modal-close"
            onClick={onClose}
            aria-label="농장 찾기 창 닫기"
          >
            ×
          </button>
        )}
        <div className="farm-modal-card">
          <div className="farm-modal-content">
            <header className="farm-modal-header">
              <h2>농장 찾기</h2>
            </header>
            <section className="farm-modal-body">
              <div className="region-select-row">
                <label>
                  <span>지역</span>
                  <select
                    value={selectedSido}
                    onChange={(event) => setSelectedSido(event.target.value)}
                  >
                    <option value="">시·도</option>
                    {regionOptions.map((sido) => (
                      <option key={sido} value={sido}>
                        {sido}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="search-field">
                  <span>검색</span>
                  <div className="search-input-group">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="동/읍/면 또는 농장명을 입력하세요"
                    />
                    <button
                      type="button"
                      className="search-button"
                      onClick={() => setSearchTerm((prev) => prev.trim())}
                      aria-label="검색"
                    >
                      🔍
                    </button>
                  </div>
                </label>
              </div>
              <div className="map-container" ref={mapContainerRef}>
                {!isMapReady && <span>카카오맵을 불러오는 중입니다...</span>}
              </div>
              <div className="farm-list-panel">
                <div className="farm-list-header">
                  <h3>주말농장 리스트</h3>
                  <p>
                    {searchTerm.trim()
                      ? `"${searchTerm.trim()}" 검색 결과`
                      : selectedSido
                      ? `${selectedSido} 지역 추천 농장`
                      : "전체 농장 목록"}
                  </p>
                </div>
                <div className="farm-list-scroll" ref={listContainerRef}>
                  {isLoading ? (
                    <div className="farm-empty">
                      농장 정보를 불러오는 중입니다...
                    </div>
                  ) : error ? (
                    <div className="farm-empty">{error}</div>
                  ) : filteredFarms.length ? (
                    filteredFarms.map((farm) => (
                      <article
                        key={farm.id}
                        data-farm-id={farm.id}
                        className={`farm-card${
                          selectedFarmId === farm.id ? " highlighted" : ""
                        }`}
                        onClick={(event) => handleFarmCardClick(farm, event)}
                      >
                        <div>
                          <h4>{farm.name}</h4>
                          <p className="farm-address">{farm.address}</p>
                          <p className="farm-phone">{farm.phone}</p>
                        </div>
                        <div className="farm-card-actions">
                          <button
                            type="button"
                            className="farm-action secondary"
                            onClick={() => {
                              if (onChatRequest) {
                                onChatRequest(farm);
                              }
                            }}
                          >
                            채팅하기
                          </button>
                          <button
                            type="button"
                            className="farm-action request"
                            onClick={() => handleApplyFarm(farm)}
                            disabled={applyingFarmId === farm.id}
                          >
                            신청하기
                          </button>
                          <button
                            type="button"
                            className="farm-action primary"
                            onClick={() => {
                              const url = `https://map.kakao.com/link/to/${encodeURIComponent(
                                farm.name
                              )},${farm.lat},${farm.lng}`;
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            길찾기
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="farm-empty">
                      해당 조건의 농장을 준비 중입니다.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {statusModal && (
        <div
          className="farm-apply-status-modal"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="farm-apply-status-modal__card">
            <h4>{statusModal.title}</h4>
            <p>{statusModal.message}</p>
            <button
              type="button"
              className="farm-apply-status-modal__close"
              onClick={() => setStatusModal(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default FarmSearchModal;
