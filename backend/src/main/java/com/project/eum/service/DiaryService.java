package com.project.eum.service;

import com.project.eum.diary.Diary;
import com.project.eum.diary.DiaryRepository;
import com.project.eum.dto.DiaryRequest;
import com.project.eum.dto.DiaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 일기 관련 비즈니스 로직을 처리하는 서비스
 */
@Service
@RequiredArgsConstructor
public class DiaryService {

    private final DiaryRepository diaryRepository;

    /**
     * 사용자의 일기 목록 조회 (최신순)
     * @param userId 사용자 ID
     * @return 일기 목록
     */
    @Transactional(readOnly = true)
    public List<DiaryResponse> getDiaries(Long userId) {
        List<Diary> diaries = diaryRepository.findByUserIdOrderByCreatedAtDesc(userId);
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
     * 이미지 파일이 있으면 Base64로 인코딩하여 DB에 저장합니다.
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
            photoUrl = encodeImageToBase64(imageFile);
        }

        Diary diary = Diary.builder()
                .userId(userId)
                .title(request.getTitle())
                .content(request.getContent())
                .photoUrl(photoUrl)
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

        // 이미지 업데이트
        if (imageFile != null && !imageFile.isEmpty()) {
            // Base64로 인코딩해서 DB에 저장 (파일 저장 없음)
            String newPhotoUrl = encodeImageToBase64(imageFile);
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
                .build();
    }

    /**
     * 이미지 파일을 Base64로 인코딩하여 Data URL 형식으로 변환
     * 파일 저장 없이 DB에 직접 저장하기 위한 메서드입니다.
     * @param imageFile 이미지 파일
     * @return Base64 인코딩된 Data URL (예: "data:image/jpeg;base64,...")
     * @throws IllegalArgumentException 이미지 크기가 1MB를 초과하는 경우
     * @throws RuntimeException 이미지 인코딩 중 오류 발생 시
     */
    private String encodeImageToBase64(MultipartFile imageFile) {
        long maxSize = 1 * 1024 * 1024; // 1MB
        if (imageFile.getSize() > maxSize) {
            throw new IllegalArgumentException("이미지 크기는 1MB 이하여야 합니다. 현재 크기: " + (imageFile.getSize() / 1024) + "KB");
        }

        try {
            byte[] imageBytes = imageFile.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            String contentType = imageFile.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                contentType = "image/jpeg";
            }

            return "data:" + contentType + ";base64," + base64Image;
        } catch (Exception e) {
            throw new RuntimeException("이미지 인코딩 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

}

