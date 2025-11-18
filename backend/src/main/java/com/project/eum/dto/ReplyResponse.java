package com.project.eum.dto;

import com.project.eum.replies.Reply;

import java.time.LocalDateTime;

/**
 * 답글 응답 DTO
 */
public record ReplyResponse(
        Long replyId,
        Long commentId,
        Long authorId,
        String nickname,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReplyResponse from(Reply reply) {
        return new ReplyResponse(
                reply.getReplyId(),
                reply.getComment().getCommentId(),
                reply.getAuthor().getUserId(),
                reply.getAuthor().getNickname(),
                reply.getContent(),
                reply.getCreatedAt(),
                reply.getUpdatedAt()
        );
    }
}