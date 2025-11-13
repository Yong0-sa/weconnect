package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.DiaryRequest;
import com.project.eum.dto.DiaryResponse;
import com.project.eum.service.DiaryService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 일기 관련 REST API 컨트롤러
 * 사용자의 재배 일기 작성, 조회, 수정, 삭제 기능을 제공합니다.
 */
@RestController
@RequestMapping({"/api/diary","/diary"})
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;

    /**
     * 사용자의 일기 목록 조회 (최신순)
     * @param session HTTP 세션
     * @return 일기 목록
     */
    @GetMapping
    public ResponseEntity<List<DiaryResponse>> getDiaries(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<DiaryResponse> diaries = diaryService.getDiaries(memberId);
        return ResponseEntity.ok(diaries);
    }

    /**
     * 일기 상세 조회
     * @param diaryId 일기 ID
     * @param session HTTP 세션
     * @return 일기 상세 정보
     */
    @GetMapping("/{diaryId}")
    public ResponseEntity<DiaryResponse> getDiary(
            @PathVariable Long diaryId,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            DiaryResponse diary = diaryService.getDiary(memberId, diaryId);
            return ResponseEntity.ok(diary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * 일기 검색 (내용에 키워드 포함)
     * @param keyword 검색 키워드
     * @param session HTTP 세션
     * @return 검색된 일기 목록
     */
    @GetMapping("/search")
    public ResponseEntity<List<DiaryResponse>> searchDiaries(
            @RequestParam String keyword,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<DiaryResponse> diaries = diaryService.searchDiaries(memberId, keyword);
        return ResponseEntity.ok(diaries);
    }

    /**
     * 일기 작성
     * 이미지 파일이 있으면 Base64로 인코딩하여 DB에 저장합니다.
     * @param request 일기 제목, 내용
     * @param imageFile 이미지 파일 (선택사항)
     * @param session HTTP 세션
     * @return 생성된 일기 정보
     */
    @PostMapping
    public ResponseEntity<DiaryResponse> createDiary(
            @RequestPart("diary") DiaryRequest request,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            DiaryResponse diary = diaryService.createDiary(memberId, request, imageFile);
            return ResponseEntity.status(HttpStatus.CREATED).body(diary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 일기 수정
     * @param diaryId 일기 ID
     * @param request 수정할 일기 제목, 내용
     * @param imageFile 새로운 이미지 파일 (선택사항, 있으면 기존 이미지 교체)
     * @param session HTTP 세션
     * @return 수정된 일기 정보
     */
    @PutMapping("/{diaryId}")
    public ResponseEntity<DiaryResponse> updateDiary(
            @PathVariable Long diaryId,
            @RequestPart("diary") DiaryRequest request,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            DiaryResponse diary = diaryService.updateDiary(memberId, diaryId, request, imageFile);
            return ResponseEntity.ok(diary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * 일기 삭제
     * @param diaryId 일기 ID
     * @param session HTTP 세션
     * @return 204 No Content
     */
    @DeleteMapping("/{diaryId}")
    public ResponseEntity<Void> deleteDiary(
            @PathVariable Long diaryId,
            HttpSession session
    ) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            diaryService.deleteDiary(memberId, diaryId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}

