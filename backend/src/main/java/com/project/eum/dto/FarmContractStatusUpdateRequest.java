package com.project.eum.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record FarmContractStatusUpdateRequest(
        @NotBlank(message = "상태를 입력해 주세요.")
        String status,
        LocalDate startDate,
        LocalDate endDate,
        String memo
) {
}
