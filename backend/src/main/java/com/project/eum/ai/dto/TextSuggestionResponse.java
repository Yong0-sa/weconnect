package com.project.eum.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 글작성 도우미 - 문장 추천 응답 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TextSuggestionResponse {

    /**
     * AI가 추천한 문장 리스트 (2개)
     */
    private List<String> suggestions;
}
