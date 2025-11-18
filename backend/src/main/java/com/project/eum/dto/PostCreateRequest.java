package com.project.eum.dto;

import com.project.eum.post.PostType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostCreateRequest {
    private String title;
    private String content;
    private String photoUrl;
    private Long authorId;
    private Long farmId;
    private PostType type;
}
