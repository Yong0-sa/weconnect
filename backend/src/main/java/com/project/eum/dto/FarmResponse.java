package com.project.eum.dto;

import com.project.eum.farm.Farm;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Farm 엔티티를 클라이언트에 반환하기 위한 응답 DTO.
 * - record로 불변 객체 형태 사용
 * - 농장 기본 정보 + 좌표 + 소유자 ID 포함
 */
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
    // Farm 엔티티를 FarmResponse로 변환하는 팩토리 메서드
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
