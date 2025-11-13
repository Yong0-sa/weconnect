package com.project.eum.farm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FarmRepository extends JpaRepository<Farm, Long> {
    Optional<Farm> findByOwnerUserId(Long ownerId);
    boolean existsByOwnerUserId(Long ownerId);
}
