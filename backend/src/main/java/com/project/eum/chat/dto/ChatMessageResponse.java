package com.project.eum.chat.dto;

import com.project.eum.chat.entity.ChatContent;

import java.time.LocalDateTime;


/**
 * 클라이언트(프론트)로 보내주는 채팅 메시지 응답 DTO
 * 채팅 목록 불러오기, WebSocket 실시간 메시지 전송 등에서 사용됨.
 */
public record ChatMessageResponse(
        Long contentId,
        Long roomId,
        Long senderId,
        String senderName,
        String content,
        LocalDateTime createdAt
) {

    /**
     * 엔티티(ChatContent)를 응답 DTO로 변환하는 메서드
     * - 널 체크를 해서 안전하게 꺼내도록 구성
     * - 서비스 레이어에서 바로 DTO로 변환해 반환할 때 사용됨
     */
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
