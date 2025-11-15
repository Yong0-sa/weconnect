package com.project.eum.chat.dto;

/**
 * 클라이언트가 보내는 채팅 메시지 요청 DTO
 * - roomId: 어떤 채팅방에 보낼 메시지인지
 * - content: 실제 메시지 내용
 *
 * WebSocket(/app/chat.send) 또는 REST(/rooms/{roomId}/messages) 요청에서 사용됨
 */
public record ChatMessagePayload(
        Long roomId,
        String content
) {
}
