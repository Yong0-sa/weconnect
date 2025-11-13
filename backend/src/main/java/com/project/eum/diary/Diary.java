package com.project.eum.diary;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 일기 엔티티
 * 사용자의 재배 일기 정보를 저장합니다.
 */
@Entity
@Table(name = "diaries")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Diary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "diary_id")
    private Long diaryId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** Base64 인코딩된 이미지 데이터를 Data URL 형식으로 저장 (최대 4GB) */
    @Column(name = "photo_url", columnDefinition = "LONGTEXT")
    private String photoUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 일기 제목 수정
     * @param title 새로운 제목
     */
    public void updateTitle(String title) {
        this.title = title;
    }

    /**
     * 일기 내용 수정
     * @param content 새로운 내용
     */
    public void updateContent(String content) {
        this.content = content;
    }

    /**
     * 일기 이미지 URL 수정
     * @param photoUrl 새로운 이미지 URL (Base64 Data URL 형식)
     */
    public void updatePhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }
}

