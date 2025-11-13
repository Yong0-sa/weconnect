package com.project.eum.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 일기 작성/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DiaryRequest {
    /** 일기 제목 */
    private String title;
    /** 일기 내용 */
    private String content;
}

