package com.project.eum.ai.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.eum.ai.dto.AIChatRequest;
import com.project.eum.ai.entity.PromptType;
import com.project.eum.ai.entity.RagQueryLog;
import com.project.eum.ai.repository.RagQueryLogRepository;
import com.project.eum.user.MemberRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@Transactional
public class AIChatService {

    private static final int DEFAULT_TOP_K = 5;
    private static final int MAX_HISTORY = 100;

    private final RagQueryLogRepository ragQueryLogRepository;
    private final MemberRepository memberRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String searchUrl;

    // 생성자: RestTemplate 설정, 타임아웃 지정, AI 서버 URL 조립
    public AIChatService(RagQueryLogRepository ragQueryLogRepository,
                         MemberRepository memberRepository,
                         RestTemplateBuilder restTemplateBuilder,
                         ObjectMapper objectMapper,
                         @Value("${ai.server.url}") String aiServerUrl) {
        
        this.ragQueryLogRepository = ragQueryLogRepository;
        this.memberRepository = memberRepository;
        this.objectMapper = objectMapper;
        
        // RestTemplate 타임아웃 설정
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(120).toMillis());
        
        this.restTemplate = restTemplateBuilder
                .requestFactory(() -> factory)
                .additionalMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
        
        // baseURL + "/api/ai/chat" 형태로 조합
        this.searchUrl = buildSearchUrl(aiServerUrl);
    }

    // 질문을 AI 서버로 보내고 로그로 저장한 뒤 RagQueryLog를 반환.
    public RagQueryLog askAndLog(Long userId, AIChatRequest request) {
        if (userId == null) {
            throw new EntityNotFoundException("로그인이 필요합니다.");
        }

        // // 공백 제거한 질문 텍스트
        String question = request.trimmedQuestion();
        if (!StringUtils.hasText(question)) {
            throw new IllegalArgumentException("질문을 입력해 주세요.");
        }
        int topK = normalizeTopK(request.topK());

        // AI 서버 호출
        AiServerResponse response = callAiServer(question);

        // 로그 엔티티 생성
        RagQueryLog logEntry = new RagQueryLog();
        logEntry.setUser(memberRepository.getReferenceById(userId));
        logEntry.setQueryText(question);
        logEntry.setPromptType(PromptType.fromRaw(response.promptType()));
        logEntry.setAnswer(response.answer());
        logEntry.setPdfLinks(response.pdfLinks());
        logEntry.setEmbedIds(response.embedIds());
        logEntry.setTopK(topK);

        return ragQueryLogRepository.saveAndFlush(logEntry);
    }

    // 사용자별 기록 조회 (최신 → 오래된 순으로 가져와 다시 반전)
    @Transactional(readOnly = true)
    public List<RagQueryLog> fetchHistory(Long userId, Integer limit) {
        if (userId == null) {
            throw new EntityNotFoundException("로그인이 필요합니다.");
        }

        int size = normalizeLimit(limit);
        
        PageRequest pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        // 최신순으로 가져오기 → 화면 편의를 위해 다시 역순 정렬
        List<RagQueryLog> logs = new ArrayList<>(ragQueryLogRepository.findByUserUserId(userId, pageable).getContent());
        Collections.reverse(logs);
        
        return logs;
    }

    // AI 서버에 질문을 보내고 응답을 AiServerResponse로 반환
    private AiServerResponse callAiServer(String question) {
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<AiServerRequest> entity = new HttpEntity<>(new AiServerRequest(question), headers);
        
        ResponseEntity<AiServerResponse> response;
        
        // AI 서버 호출
        try {
            logPayload(question);
            response = restTemplate.postForEntity(searchUrl, entity, AiServerResponse.class);
        
        // AI 서버와의 통신 오류 처리
        } catch (RestClientException ex) {
            log.error("AI 서버 호출 실패: {}", ex.getMessage(), ex);
            throw new AiServerException("AI 서버와 통신하지 못했습니다.", ex);
        }

        // 응답 검증
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new AiServerException("AI 서버가 올바른 응답을 반환하지 않았습니다.");
        }

        AiServerResponse body = response.getBody();
        
        // 응답을 안전하게 복사
        return new AiServerResponse(
                body.id(),
                question,
                body.answer(),
                safeList(body.pdfLinks()),
                body.promptType(),
                safeList(body.embedIds()),
                body.createdAt()
        );
    }

    // List null-safe 변환
    private static List<String> safeList(List<String> input) {
        return input == null ? new ArrayList<>() : new ArrayList<>(input);
    }

    // topK 처리
    private int normalizeTopK(Integer topK) {
        if (topK == null) {
            return DEFAULT_TOP_K;
        }
        return Math.min(Math.max(topK, 1), 50);
    }

    // 이력 limit 처리
    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 50;
        }
        return Math.min(Math.max(limit, 1), MAX_HISTORY);
    }

    // baseUrl 마지막 슬래시 제거 후 "/api/ai/chat" 붙이기
    private String buildSearchUrl(String baseUrl) {
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalArgumentException("ai.server.url 값이 설정되지 않았습니다.");
        }
        String trimmed = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return trimmed + "/api/ai/chat";
    }

    // AI 요청 페이로드를 JSON 문자열로 로깅
    private void logPayload(String question) {
        
        try {
            log.info("AI request payload={}", objectMapper.writeValueAsString(new AiServerRequest(question)));
        
        } catch (JsonProcessingException ex) {
            log.warn("AI 요청 페이로드 직렬화 실패: {}", ex.getMessage());
        }
    }

    // AI 서버 요청/응답 DTO
    private record AiServerRequest(String question) {}

    // 내부용 응답 DTO → AI 서버 응답 매핑
    private record AiServerResponse(
            String id,
            String question,
            String answer,
            @JsonProperty("pdf_links") List<String> pdfLinks,
            @JsonProperty("prompt_type") String promptType,
            @JsonProperty("embed_ids") List<String> embedIds,
            @JsonProperty("created_at") String createdAt
    ) {}
}
