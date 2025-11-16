package com.project.eum.farm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Farm 엔티티용 Repository.
 * - 농장 조회 및 존재 여부 확인 메서드 포함
 */
public interface FarmRepository extends JpaRepository<Farm, Long> {
    // 특정 회원(owner)의 농장을 조회
    Optional<Farm> findByOwnerUserId(Long ownerId);
    // 특정 회원(owner)이 농장을 가지고 있는지 여부 확인
    boolean existsByOwnerUserId(Long ownerId);
}
