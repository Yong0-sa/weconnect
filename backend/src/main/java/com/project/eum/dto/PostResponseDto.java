package com.project.eum.dto;

import com.project.eum.post.Post;

import java.time.LocalDateTime;

public class PostResponseDto {
    private Long id;
    private String title;
    private String content;
    private Long authorId;
    private String userNickname;
    private Long farmId;
    private String photoUrl;
    private LocalDateTime createdAt;

    public PostResponseDto(Post post) {
        this.id = post.getPostId();
        this.title = post.getTitle();
        this.content = post.getContent();
        this.authorId = post.getAuthor().getUserId();
        this.userNickname = post.getAuthor().getNickname();
        this.farmId = post.getFarm().getFarmId();
        this.photoUrl = post.getPhotoUrl();
        this.createdAt = post.getCreatedAt();
    }

    // getter/setter
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public Long getAuthorId() { return authorId; }
    public String getUserNickname() {return userNickname;}
    public Long getFarmId() { return farmId; }
    public String getPhotoUrl() { return photoUrl; }
    public LocalDateTime getCreatedAt() {return createdAt;}

    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setContent(String content) { this.content = content; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public void setUserNickname(String userNickname) {this.userNickname = userNickname;}
    public void setCreatedAt(LocalDateTime createdAt) {this.createdAt = createdAt;}
}
