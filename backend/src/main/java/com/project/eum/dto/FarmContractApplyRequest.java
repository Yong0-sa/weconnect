package com.project.eum.dto;

import jakarta.validation.constraints.NotNull;

public record FarmContractApplyRequest(
        @NotNull(message = "농장을 선택해 주세요.")
        Long farmId
) {
}
