package com.project.eum.farm.contract;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FarmContractRepository extends JpaRepository<FarmContract, Long> {
    boolean existsByFarmFarmIdAndUserUserId(Long farmId, Long userId);
    Optional<FarmContract> findByFarmFarmIdAndUserUserId(Long farmId, Long userId);
    List<FarmContract> findByFarmOwnerUserId(Long ownerId);
    List<FarmContract> findByStatusAndEndDateBefore(FarmContractStatus status, java.time.LocalDate date);
}
