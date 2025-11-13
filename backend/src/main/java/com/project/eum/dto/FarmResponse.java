package com.project.eum.dto;

import com.project.eum.farm.Farm;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FarmResponse(
        Long farmId,
        String name,
        String city,
        String address,
        String tel,
        Long ownerId,
        BigDecimal latitude,
        BigDecimal longitude,
        LocalDateTime createdAt
) {
    public static FarmResponse from(Farm farm) {
        return new FarmResponse(
                farm.getFarmId(),
                farm.getName(),
                farm.getCity(),
                farm.getAddress(),
                farm.getTel(),
                farm.getOwner() != null ? farm.getOwner().getUserId() : null,
                farm.getLatitude(),
                farm.getLongitude(),
                farm.getCreatedAt()
        );
    }
}
