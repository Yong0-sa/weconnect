package com.project.eum.ai.repository;

import com.project.eum.ai.entity.RagQueryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * RagQueryLog 엔티티를 관리하는 JPA 리포지토리.
 * - 기본 CRUD 기능 상속 (save, findById, delete 등)
 * - 사용자별 로그 조회 기능 제공
 */

public interface RagQueryLogRepository extends JpaRepository<RagQueryLog, Long> {
    Page<RagQueryLog> findByUserUserId(Long userId, Pageable pageable);
}
