package com.project.eum.ai.repository;

import com.project.eum.ai.entity.RagQueryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RagQueryLogRepository extends JpaRepository<RagQueryLog, Long> {
    Page<RagQueryLog> findByUserUserId(Long userId, Pageable pageable);
}
