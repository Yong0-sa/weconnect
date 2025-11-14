package com.project.eum.chat.dto;

import com.project.eum.chat.entity.ChatContent;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long contentId,
        Long roomId,
        Long senderId,
        String senderName,
        String content,
        LocalDateTime createdAt
) {

    public static ChatMessageResponse from(ChatContent entity) {
        return new ChatMessageResponse(
                entity.getContentId(),
                entity.getRoom() != null ? entity.getRoom().getRoomId() : null,
                entity.getSender() != null ? entity.getSender().getUserId() : null,
                entity.getSender() != null ? entity.getSender().getName() : null,
                entity.getContent(),
                entity.getCreatedAt()
        );
    }
}
