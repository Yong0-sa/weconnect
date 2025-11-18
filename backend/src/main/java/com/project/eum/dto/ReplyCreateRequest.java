package com.project.eum.dto;

import com.project.eum.replies.Reply;

import java.time.LocalDateTime;

public record ReplyCreateRequest(
        Long commentId,
        Long authorId,
        String content
) {
}
