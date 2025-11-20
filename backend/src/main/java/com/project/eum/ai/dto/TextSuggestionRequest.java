package com.project.eum.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * AI 글작성 도우미 - 문장 추천 요청 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TextSuggestionRequest {

    /**
     * 현재 작성 중인 텍스트 내용
     */
    @NotBlank(message = "내용을 입력해주세요.")
    private String content;

    /**
     * 농장 ID (권한 검증용)
     */
    @NotNull(message = "농장 ID가 필요합니다.")
    private Long farmId;
}
