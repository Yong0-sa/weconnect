package com.project.eum.chat.dto;

public record ChatMessagePayload(
        Long roomId,
        String content
) {
}
