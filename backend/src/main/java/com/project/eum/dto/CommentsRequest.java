package com.project.eum.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentsRequest {
    private Long postId;
    private Long authorId;
    private String content;
}
