package com.project.eum.ai.entity;

import java.util.Locale;

public enum PromptType {
    GREET,
    ANSWER,
    FALLBACK;

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

    public String getValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}

