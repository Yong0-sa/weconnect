package com.project.eum.dto;

public record ReplyCreateRequest(
        Long commentId,
        Long authorId,
        String content
) {
}
