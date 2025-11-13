package com.project.eum.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 일기 응답 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiaryResponse {
    /** 일기 ID */
    private Long diaryId;
    /** 일기 제목 */
    private String title;
    /** 일기 내용 */
    private String content;
    /** 이미지 URL (Base64 Data URL 형식) */
    private String photoUrl;
    /** 생성 일시 */
    private LocalDateTime createdAt;
    /** 수정 일시 */
    private LocalDateTime updatedAt;
}

