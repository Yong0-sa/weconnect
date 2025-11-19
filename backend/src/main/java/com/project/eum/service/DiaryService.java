package com.project.eum.service;

import com.project.eum.diary.Diary;
import com.project.eum.diary.DiaryRepository;
import com.project.eum.dto.DiaryRequest;
import com.project.eum.dto.DiaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 일기 관련 비즈니스 로직을 처리하는 서비스
 */
@Service
@RequiredArgsConstructor
public class DiaryService {

    private static final long MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

    private final DiaryRepository diaryRepository;
    private final ObjectStorageService objectStorageService;

    /**
     * 사용자의 일기 목록 조회 (최신순)
     * @param userId 사용자 ID
     * @return 일기 목록
     */
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiaries(Long userId) {
        List<Diary> diaries = diaryRepository.findByUserIdOrderBySelectAtDesc(userId);
        return diaries.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 일기 상세 조회
     * @param userId 사용자 ID
     * @param diaryId 일기 ID
     * @return 일기 상세 정보
     * @throws IllegalArgumentException 일기를 찾을 수 없거나 본인의 일기가 아닌 경우
     */
    @Transactional(readOnly = true)
    public DiaryResponse getDiary(Long userId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new IllegalArgumentException("일기를 찾을 수 없습니다."));

        if (!diary.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 일기만 조회할 수 있습니다.");
        }

        return toResponse(diary);
    }

    /**
     * 일기 검색 (내용에 키워드 포함)
     * @param userId 사용자 ID
     * @param keyword 검색 키워드
     * @return 검색된 일기 목록
     */
    @Transactional(readOnly = true)
    public List<DiaryResponse> searchDiaries(Long userId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getDiaries(userId);
        }

        List<Diary> diaries = diaryRepository.findByUserIdAndContentContaining(userId, keyword.trim());
        return diaries.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 일기 작성
     * 이미지 파일이 있으면 Object Storage에 업로드 후 URL을 저장합니다.
     * @param userId 사용자 ID
     * @param request 일기 제목, 내용
     * @param imageFile 이미지 파일 (선택사항)
     * @return 생성된 일기 정보
     * @throws IllegalArgumentException 이미지 크기가 1MB를 초과하는 경우
     */
    @Transactional
    public DiaryResponse createDiary(Long userId, DiaryRequest request, MultipartFile imageFile) {
        String photoUrl = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            validateImageSize(imageFile);
            photoUrl = objectStorageService.uploadDiaryImage(imageFile, userId);
        }

        Diary diary = Diary.builder()
                .userId(userId)
                .title(request.getTitle())
                .content(request.getContent())
                .photoUrl(photoUrl)
                .selectAt(request.getDate() != null ? request.getDate().atStartOfDay() : null) // 선택한 날짜를 00:00:00으로 설정
                .build();

        Diary savedDiary = diaryRepository.save(diary);
        return toResponse(savedDiary);
    }

    /**
     * 일기 수정
     * @param userId 사용자 ID
     * @param diaryId 일기 ID
     * @param request 수정할 일기 제목, 내용
     * @param imageFile 새로운 이미지 파일 (선택사항, 있으면 기존 이미지 교체)
     * @return 수정된 일기 정보
     * @throws IllegalArgumentException 일기를 찾을 수 없거나 본인의 일기가 아닌 경우
     */
    @Transactional
    public DiaryResponse updateDiary(Long userId, Long diaryId, DiaryRequest request, MultipartFile imageFile) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new IllegalArgumentException("일기를 찾을 수 없습니다."));

        if (!diary.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 일기만 수정할 수 있습니다.");
        }

        // 내용 업데이트
        if (request.getTitle() != null) {
            diary.updateTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            diary.updateContent(request.getContent());
        }

        // 선택한 날짜 업데이트
        if (request.getDate() != null) {
            diary.updateSelectAt(request.getDate());
        }

        // 이미지 업데이트
        if (imageFile != null && !imageFile.isEmpty()) {
            validateImageSize(imageFile);
            String newPhotoUrl = objectStorageService.uploadDiaryImage(imageFile, userId);
            diary.updatePhotoUrl(newPhotoUrl);
        }

        return toResponse(diary);
    }

    /**
     * 일기 삭제
     * @param userId 사용자 ID
     * @param diaryId 일기 ID
     * @throws IllegalArgumentException 일기를 찾을 수 없거나 본인의 일기가 아닌 경우
     */
    @Transactional
    public void deleteDiary(Long userId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new IllegalArgumentException("일기를 찾을 수 없습니다."));

        if (!diary.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 일기만 삭제할 수 있습니다.");
        }

        if (diary.getPhotoUrl() != null) {
            objectStorageService.deleteObjectByUrl(diary.getPhotoUrl());
        }

        diaryRepository.delete(diary);
    }

    /**
     * Diary 엔티티를 DiaryResponse DTO로 변환
     * @param diary Diary 엔티티
     * @return DiaryResponse DTO
     */
    private DiaryResponse toResponse(Diary diary) {
        return DiaryResponse.builder()
                .diaryId(diary.getDiaryId())
                .title(diary.getTitle())
                .content(diary.getContent())
                .photoUrl(diary.getPhotoUrl())
                .createdAt(diary.getCreatedAt())
                .updatedAt(diary.getUpdatedAt())
                .selectAt(diary.getSelectAt())
                .build();
    }

    private void validateImageSize(MultipartFile imageFile) {
        if (imageFile.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("이미지 크기는 1MB 이하여야 합니다. 현재 크기: " + (imageFile.getSize() / 1024) + "KB");
        }
    }

}

