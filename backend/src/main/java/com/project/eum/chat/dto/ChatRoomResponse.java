package com.project.eum.chat.dto;

import com.project.eum.chat.entity.ChatRoom;
import com.project.eum.chat.entity.ChatRoomStatus;

import java.time.LocalDateTime;

public record ChatRoomResponse(
        Long roomId,
        Long farmId,
        String farmName,
        Long farmerId,
        String farmerName,
        Long userId,
        String userName,
        ChatRoomStatus status,
        LocalDateTime lastMessageAt,
        LocalDateTime updatedAt
) {

    public static ChatRoomResponse from(ChatRoom room) {
        return new ChatRoomResponse(
                room.getRoomId(),
                room.getFarm() != null ? room.getFarm().getFarmId() : null,
                room.getFarm() != null ? room.getFarm().getName() : null,
                room.getFarmer() != null ? room.getFarmer().getUserId() : null,
                room.getFarmer() != null ? room.getFarmer().getName() : null,
                room.getUser() != null ? room.getUser().getUserId() : null,
                room.getUser() != null ? room.getUser().getName() : null,
                room.getStatus(),
                room.getLastMessageAt(),
                room.getUpdatedAt()
        );
    }
}
