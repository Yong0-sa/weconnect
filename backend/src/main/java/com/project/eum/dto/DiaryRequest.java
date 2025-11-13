package com.project.eum.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

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
    /** 선택한 날짜 (선택사항) */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;
}

