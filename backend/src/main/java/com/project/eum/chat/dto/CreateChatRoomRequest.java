package com.project.eum.chat.dto;

import jakarta.validation.constraints.NotNull;

public record CreateChatRoomRequest(
        @NotNull(message = "농장 ID는 필수입니다.")
        Long farmId,

        @NotNull(message = "농장주 ID는 필수입니다.")
        Long farmerId,

        @NotNull(message = "사용자 ID는 필수입니다.")
        Long userId
) {
}
