package com.project.eum.ai.dto;

import com.project.eum.ai.entity.RagQueryLog;
import com.project.eum.ai.entity.PromptType;

import java.time.LocalDateTime;
import java.util.List;

public record AIChatExchangeResponse(
        Long logId,
        String question,
        String answer,
        String promptType,
        List<String> pdfLinks,
        List<String> embedIds,
        Integer topK,
        LocalDateTime createdAt
) {
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

    private static String resolvePromptType(PromptType promptType) {
        return promptType == null ? PromptType.ANSWER.getValue() : promptType.getValue();
    }

    private static List<String> copyOfOrEmpty(List<String> source) {
        return source == null ? List.of() : List.copyOf(source);
    }
}
