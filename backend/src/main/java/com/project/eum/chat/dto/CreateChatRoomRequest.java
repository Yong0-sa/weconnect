package com.project.eum.chat.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 채팅방 생성 요청 DTO
 * 프론트에서 방을 만들 때 필요한 정보 3가지
 * 세 값이 모두 있어야 "이 조합의 방이 이미 있는지" 확인해서
 * 기존 방을 반환하거나 새 방을 만들 수 있음.
 * @NotNull → 값이 비어있으면 자동으로 400(Bad Request) 발생.
 */
public record CreateChatRoomRequest(
        @NotNull(message = "농장 ID는 필수입니다.")
        Long farmId,

        @NotNull(message = "농장주 ID는 필수입니다.")
        Long farmerId,

        @NotNull(message = "사용자 ID는 필수입니다.")
        Long userId
) {
}
