package com.project.eum.ai.dto;

import com.project.eum.ai.entity.PromptType;
import com.project.eum.ai.entity.RagQueryLog;
import com.project.eum.ai.model.ReferenceLink;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 질문·응답 로그를 API 응답 형태로 변환하는 DTO(record).
 * RagQueryLog 엔티티 → 클라이언트가 받을 데이터 형태로 매핑한다.
 */

public record AIChatExchangeResponse(
        Long logId,
        String question,
        String answer,
        String promptType,
        List<ReferenceLink> pdfLinks,
        List<String> embedIds,
        Integer topK,
        LocalDateTime createdAt
) {

    // RagQueryLog 엔티티를 DTO로 변환하는 정적 메서드
    public static AIChatExchangeResponse from(RagQueryLog log) {
        return new AIChatExchangeResponse(
                log.getId(),
                log.getQueryText(),
                log.getAnswer(),
                resolvePromptType(log.getPromptType()),
                copyOfOrEmpty(log.getPdfLinks()),
                copyOfOrEmpty(log.getEmbedIds()),
                log.getTopK(),
                log.getCreatedAt()
        );
    }

    // PromptType이 null인 경우 기본값 ANSWER의 값을 반환하는 헬퍼 메서드
    private static String resolvePromptType(PromptType promptType) {
        return promptType == null ? PromptType.ANSWER.getValue() : promptType.getValue();
    }

    // Null 안전 처리. Null이면 빈 리스트 반환, 아니면 불변 리스트로 복사
    private static <T> List<T> copyOfOrEmpty(List<T> source) {
        return source == null ? List.of() : List.copyOf(source);
    }
}
