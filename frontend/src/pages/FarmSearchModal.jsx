import { useEffect, useMemo, useRef, useState } from "react";
import "./FarmSearchModal.css";
import { farms as mockFarms, regionOptions } from "../data/farms";

function FarmSearchModal({ onClose, onChatRequest }) {
  const [selectedSido, setSelectedSido] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const filteredFarms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (keyword) {
      return mockFarms.filter(
        (farm) =>
          farm.name.toLowerCase().includes(keyword) ||
          farm.address.toLowerCase().includes(keyword)
      );
    }

    if (!selectedSido) {
      return mockFarms;
    }

    const prefix = selectedSido.slice(0, 2);
    return mockFarms.filter(
      (farm) =>
        farm.address.startsWith(prefix) ||
        farm.address.includes(selectedSido) ||
        farm.name.includes(prefix)
    );
  }, [selectedSido, searchTerm]);

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

  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || !window.kakao?.maps) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 6,
      });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!filteredFarms.length) return;

    const bounds = new window.kakao.maps.LatLngBounds();

    filteredFarms.forEach((farm) => {
      const position = new window.kakao.maps.LatLng(farm.lat, farm.lng);
      const marker = new window.kakao.maps.Marker({
        position,
        map: mapRef.current,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        setHighlightedId(farm.id);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        setHighlightedId(null);
      });
      window.kakao.maps.event.addListener(marker, "click", () => {
        setHighlightedId(farm.id);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (!bounds.isEmpty()) {
      mapRef.current.setBounds(bounds, 60, 60, 60, 60);
    }
  }, [filteredFarms, isMapReady]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  return (
    <div className="farm-modal-shell">
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
              <div className="farm-list-scroll">
                {filteredFarms.length ? (
                  filteredFarms.map((farm) => (
                    <article
                      key={farm.id}
                      className={`farm-card${
                        highlightedId === farm.id ? " highlighted" : ""
                      }`}
                      onMouseEnter={() => setHighlightedId(farm.id)}
                      onMouseLeave={() => setHighlightedId(null)}
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
                        <button type="button" className="farm-action request">
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
  );
}

export default FarmSearchModal;
