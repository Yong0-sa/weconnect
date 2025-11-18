package com.project.eum.chat.dto;

import com.project.eum.chat.entity.ChatRoom;
import com.project.eum.chat.entity.ChatRoomStatus;

import java.time.LocalDateTime;

/**
 * 채팅방 정보를 프론트로 내려줄 때 사용하는 DTO
 *
 * 화면에서 필요한 정보들을 모두 담고 있음.
 * 목록 조회, 방 입장, 방 목록 정렬 등에 사용됨
 */
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
        LocalDateTime updatedAt,
        String lastMessagePreview,
        LocalDateTime farmerLastReadAt,
        LocalDateTime userLastReadAt
) {

    /**
     * ChatRoom 엔티티 → ChatRoomResponse DTO 변환
     * - Null 안전 처리: 농장/농장주/사용자가 null일 수 있어 체크 후 매핑
     * - 컨트롤러/서비스에서 엔티티를 바로 내려보내지 않기 때문에 이 변환이 필요함
     */
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
                room.getUpdatedAt(),
                room.getLastMessagePreview(),
                room.getFarmerLastReadAt(),
                room.getUserLastReadAt()
        );
    }
}
