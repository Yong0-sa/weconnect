package com.project.eum.service;

import com.project.eum.config.KakaoMapProperties;
import com.project.eum.service.dto.GeoCoordinate;
import com.project.eum.service.dto.KakaoAddressSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Kakao 주소 검색 API 클라이언트.
 * - 주소 문자열을 입력받아 위/경도(GeoCoordinate)를 조회
 * - REST API Key 검증 및 응답 구조 처리 포함
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KakaoAddressSearchClient {

    private static final String AUTHORIZATION_PREFIX = "KakaoAK ";

    private final RestClient.Builder restClientBuilder;
    private final KakaoMapProperties kakaoMapProperties;

    /**
     * 주소 → 위/경도 변환.
     * 1. 주소/REST API Key 검증
     * 2. Kakao 주소 검색 API 호출
     * 3. 첫 번째 좌표 결과 반환(Optional)
     */
    public Optional<GeoCoordinate> findCoordinatesByAddress(String address) {
        // 주소 비어있으면 조회 불가
        if (!StringUtils.hasText(address)) {
            return Optional.empty();
        }

        // API Key 없으면 조회 스킵
        if (!StringUtils.hasText(kakaoMapProperties.getRestApiKey())) {
            log.warn("Kakao REST API 키가 설정되지 않아 주소 기반 위/경도 조회를 건너뜁니다.");
            return Optional.empty();
        }

        // 요청 URI 생성
        URI uri = UriComponentsBuilder.fromHttpUrl(kakaoMapProperties.getAddressSearchUrl())
                .queryParam("query", address.trim())
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUri();

        try {
            // REST 호출
            KakaoAddressSearchResponse response = restClientBuilder.build()
                    .get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, AUTHORIZATION_PREFIX + kakaoMapProperties.getRestApiKey())
                    .retrieve()
                    .body(KakaoAddressSearchResponse.class);

            // 응답에서 첫 번째 좌표 추출
            return Optional.ofNullable(response)
                    .flatMap(KakaoAddressSearchResponse::firstCoordinate);
        } catch (RestClientException ex) {
            log.error("Kakao 주소 검색 API 호출 중 오류가 발생했습니다: {}", ex.getMessage(), ex);
            return Optional.empty();
        }
    }
}
