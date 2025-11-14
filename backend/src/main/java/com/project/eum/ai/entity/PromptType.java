package com.project.eum.ai.entity;

import java.util.Locale;

/**
 * AI가 어떤 종류의 프롬프트로 응답했는지 나타내는 Enum.
 * - GREET    : 환영/인사 프롬프트
 * - ANSWER   : 일반 답변 프롬프트
 * - FALLBACK : 대체/예외 처리용 프롬프트
 */

public enum PromptType {
    GREET,
    ANSWER,
    FALLBACK;

    //  문자열(raw)을 받아 PromptType으로 변환.
    //  null 이거나 알 수 없는 값이면 기본값 ANSWER 반환.
    public static PromptType fromRaw(String value) {
        if (value == null) {
            return ANSWER;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "greet" -> GREET;
            case "fallback" -> FALLBACK;
            default -> ANSWER;
        };
    }

    //  enum 이름을 소문자 문자열로 반환.
    //  DB 저장·응답 DTO 변환 시 사용.
    public String getValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}

