package com.project.eum.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AIChatRequest(
        @NotBlank(message = "질문을 입력해 주세요.")
        String question,
        @Min(value = 1, message = "topK는 1 이상이어야 합니다.")
        @Max(value = 50, message = "topK는 50 이하까지만 지원합니다.")
        Integer topK
) {
    public String trimmedQuestion() {
        return question == null ? "" : question.trim();
    }
}

