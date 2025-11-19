package com.project.eum.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyUpdateRequest(
        @NotBlank(message = "답글 내용을 입력해주세요.")
        String content
) {
}
