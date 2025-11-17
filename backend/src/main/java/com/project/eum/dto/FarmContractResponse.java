package com.project.eum.dto;

import com.project.eum.farm.contract.FarmContract;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record FarmContractResponse(
        Long contractId,
        Long farmId,
        String farmName,
        Long userId,
        String nickname,
        String name,
        String email,
        String phone,
        String status,
        LocalDateTime requestedAt,
        LocalDateTime decidedAt,
        LocalDate startDate,
        LocalDate endDate,
        String memo
) {
    public static FarmContractResponse from(FarmContract contract) {
        return new FarmContractResponse(
                contract.getContractId(),
                contract.getFarm().getFarmId(),
                contract.getFarm().getName(),
                contract.getUser().getUserId(),
                contract.getUser().getNickname(),
                contract.getUser().getName(),
                contract.getUser().getEmail(),
                contract.getUser().getPhone(),
                contract.getStatus().name(),
                contract.getRequestedAt(),
                contract.getDecidedAt(),
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getMemo()
        );
    }
}
