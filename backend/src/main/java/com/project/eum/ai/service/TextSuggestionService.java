package com.project.eum.ai.service;

import com.project.eum.ai.dto.TextSuggestionRequest;
import com.project.eum.ai.dto.TextSuggestionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * AI 글작성 도우미 서비스
 * Python AI 서버의 텍스트 제안 엔드포인트를 호출
 */
@Slf4j
@Service
public class TextSuggestionService {

    private final RestTemplate restTemplate;
    private final String textSuggestionUrl;

    public TextSuggestionService(RestTemplateBuilder restTemplateBuilder,
                                  @Value("${ai.server.url}") String aiServerUrl) {

        // RestTemplate 타임아웃 설정
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());  // 문장 추천은 빠르게

        this.restTemplate = restTemplateBuilder
                .requestFactory(() -> factory)
                .additionalMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();

        // AI 서버 URL + "/text-suggestions"
        this.textSuggestionUrl = buildUrl(aiServerUrl);
    }

    /**
     * AI 서버에 텍스트 제안 요청
     * @param request 현재 작성 중인 내용과 farmId
     * @return 2개의 추천 문장 리스트
     */
    public TextSuggestionResponse getSuggestions(TextSuggestionRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // AI 서버로 보낼 페이로드 (content만 전송)
        AiTextSuggestionRequest payload = new AiTextSuggestionRequest(request.getContent());
        HttpEntity<AiTextSuggestionRequest> entity = new HttpEntity<>(payload, headers);

        try {
            log.debug("AI 서버 문장 추천 요청: {}", request.getContent());

            ResponseEntity<AiTextSuggestionResponse> response = restTemplate.postForEntity(
                    textSuggestionUrl,
                    entity,
                    AiTextSuggestionResponse.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("AI 서버 응답 실패: status={}", response.getStatusCode());
                return new TextSuggestionResponse(Collections.emptyList());
            }

            List<String> suggestions = response.getBody().suggestions();
            log.debug("AI 서버 문장 추천 응답: {} 개", suggestions != null ? suggestions.size() : 0);

            return new TextSuggestionResponse(suggestions != null ? suggestions : Collections.emptyList());

        } catch (RestClientException ex) {
            log.error("AI 서버 통신 실패: {}", ex.getMessage(), ex);
            // 예외 발생 시 빈 리스트 반환 (사용자 경험 유지)
            return new TextSuggestionResponse(Collections.emptyList());
        }
    }

    private String buildUrl(String baseUrl) {
        String normalized = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return normalized + "/text-suggestions";
    }

    // AI 서버로 보낼 요청 DTO
    private record AiTextSuggestionRequest(String content) {}

    // AI 서버에서 받을 응답 DTO
    private record AiTextSuggestionResponse(List<String> suggestions) {}
}
