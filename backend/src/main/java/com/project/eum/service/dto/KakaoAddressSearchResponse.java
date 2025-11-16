package com.project.eum.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * 카카오 주소 검색 API 응답 DTO.
 * - documents 안에 여러 주소 후보가 들어있음
 * - firstCoordinate()로 첫 번째 좌표를 추출하여 내부에서 사용
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoAddressSearchResponse(
        List<Document> documents
) {

    /**
     * 검색 결과 중 첫 번째 좌표를 반환.
     * - documents 비어 있으면 Optional.empty()
     * - Document → GeoCoordinate 변환 후 가장 먼저 나오는 결과 사용
     */
    public Optional<GeoCoordinate> firstCoordinate() {
        if (CollectionUtils.isEmpty(documents)) {
            return Optional.empty();
        }
        return documents.stream()
                .map(Document::toCoordinate) // 각 Document → Optional<GeoCoordinate>
                .flatMap(Optional::stream)   // Optional 내부 값 flatten
                .findFirst();                // 첫 좌표만 사용
    }

    /**
     * Kakao API의 단일 검색 결과 문서.
     * - x: 경도(longitude)
     * - y: 위도(latitude)
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Document(
            @JsonProperty("x")
            String longitude,

            @JsonProperty("y")
            String latitude
    ) {

        /**
         * Kakao 문자열 좌표 → GeoCoordinate 변환.
         * - 값이 없거나 숫자가 아니면 Optional.empty()
         */
        public Optional<GeoCoordinate> toCoordinate() {
            if (!StringUtils.hasText(latitude) || !StringUtils.hasText(longitude)) {
                return Optional.empty();
            }

            try {
                return Optional.of(new GeoCoordinate(
                        new BigDecimal(latitude),
                        new BigDecimal(longitude)
                ));
            } catch (NumberFormatException ex) {
                // 좌표가 숫자가 아닐 경우 안전하게 건너뜀
                return Optional.empty();
            }
        }
    }
}
