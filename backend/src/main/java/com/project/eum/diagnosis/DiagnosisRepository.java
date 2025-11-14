package com.project.eum.diagnosis;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 작물 진단 결과 데이터 접근을 위한 리포지토리
 */
public interface DiagnosisRepository extends JpaRepository<Diagnosis, Long> {
    Optional<Diagnosis> findByDiagnosisIdAndUserId(Long diagnosisId, Long userId);
}


