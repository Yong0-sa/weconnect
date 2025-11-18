package com.project.eum.dto;

import com.project.eum.replies.Reply;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record ReplyUpdateRequest(
        @NotBlank(message = "답글 내용을 입력해주세요.")
        String content
) {
}
