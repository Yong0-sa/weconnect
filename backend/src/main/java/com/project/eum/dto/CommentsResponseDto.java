package com.project.eum.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class CommentsResponseDto {
    private Long commentId;
    private Long postId;
    private Long userId;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;
    List<ReplyResponse> replies;

    public CommentsResponseDto(Long commentId, Long postId, Long userId, String nickname, String content, LocalDateTime createdAt) {
        this.commentId = commentId;
        this.postId = postId;
        this.userId = userId;
        this.nickname = nickname;
        this.content = content;
        this.createdAt = createdAt;
        this.replies = new ArrayList<>();
    }
}

