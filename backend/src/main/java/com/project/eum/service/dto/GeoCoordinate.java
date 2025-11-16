package com.project.eum.service.dto;

import java.math.BigDecimal;

/**
 * 위도/경도 정보를 담는 단순 좌표 DTO.
 * - Kakao 주소 검색 API 응답 → 내부 좌표 변환 시 사용
 */
public record GeoCoordinate(BigDecimal latitude, BigDecimal longitude) {
}
