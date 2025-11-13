package com.project.eum.diary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 일기 데이터 접근을 위한 리포지토리
 */
public interface DiaryRepository extends JpaRepository<Diary, Long> {

    /**
     * 사용자별 일기 목록 조회 (최신순)
     * @param userId 사용자 ID
     * @return 일기 목록
     */
    List<Diary> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 사용자별 일기 검색 (내용에 키워드 포함)
     * @param userId 사용자 ID
     * @param keyword 검색 키워드
     * @return 검색된 일기 목록
     */
    @Query("SELECT d FROM Diary d WHERE d.userId = :userId AND d.content LIKE %:keyword% ORDER BY d.createdAt DESC")
    List<Diary> findByUserIdAndContentContaining(@Param("userId") Long userId, @Param("keyword") String keyword);

    /**
     * 사용자별 일기 존재 여부 확인
     * @param userId 사용자 ID
     * @param diaryId 일기 ID
     * @return 존재 여부
     */
    boolean existsByUserIdAndDiaryId(Long userId, Long diaryId);
}

