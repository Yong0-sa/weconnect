package com.project.eum.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * AI에게 질문을 보낼 때 사용하는 요청 DTO.
 * 질문 내용과 topK 옵션을 함께 전달한다.
 */

public record AIChatRequest(
        // 빈 문자열 또는 공백만 있으면 검증 실패
        @NotBlank(message = "질문을 입력해 주세요.")
        String question,
        @Min(value = 1, message = "topK는 1 이상이어야 합니다.")
        @Max(value = 50, message = "topK는 50 이하까지만 지원합니다.")
        Integer topK
) {
    
    // 질문 문자열의 앞뒤 공백을 제거한 값을 반환하는 헬퍼 메서드
    public String trimmedQuestion() {
        return question == null ? "" : question.trim();
    }
}

