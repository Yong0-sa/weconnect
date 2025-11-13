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
     * 사용자별 일기 목록 조회 (선택한 날짜 기준 내림차순, null은 마지막)
     * @param userId 사용자 ID
     * @return 일기 목록
     */
    @Query("SELECT d FROM Diary d WHERE d.userId = :userId ORDER BY " +
            "CASE WHEN d.selectAt IS NULL THEN 1 ELSE 0 END, " +
            "d.selectAt DESC, d.createdAt DESC")
    List<Diary> findByUserIdOrderBySelectAtDesc(@Param("userId") Long userId);

    /**
     * 사용자별 일기 검색 (내용에 키워드 포함, 선택한 날짜 기준 정렬)
     * @param userId 사용자 ID
     * @param keyword 검색 키워드
     * @return 검색된 일기 목록
     */
    @Query("SELECT d FROM Diary d WHERE d.userId = :userId AND d.content LIKE %:keyword% ORDER BY " +
            "CASE WHEN d.selectAt IS NULL THEN 1 ELSE 0 END, " +
            "d.selectAt DESC, d.createdAt DESC")
    List<Diary> findByUserIdAndContentContaining(@Param("userId") Long userId, @Param("keyword") String keyword);

    /**
     * 사용자별 일기 존재 여부 확인
     * @param userId 사용자 ID
     * @param diaryId 일기 ID
     * @return 존재 여부
     */
    boolean existsByUserIdAndDiaryId(Long userId, Long diaryId);
}

