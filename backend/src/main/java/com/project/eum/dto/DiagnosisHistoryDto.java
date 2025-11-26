package com.project.eum.dto;

import com.project.eum.diagnosis.Diagnosis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 진단 내역 조회용 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosisHistoryDto {

    private Long diagnosisId;
    private Long userId;
    private String cropName;
    private String photoUrl;  // CDN URL로 변환된 이미지 URL
    private String diseaseName;
    private String recommendation;
    private LocalDateTime createdAt;

    /**
     * Diagnosis 엔티티에서 DTO 생성 (photoUrl은 별도로 설정)
     */
    public static DiagnosisHistoryDto from(Diagnosis diagnosis, String publicPhotoUrl) {
        return DiagnosisHistoryDto.builder()
                .diagnosisId(diagnosis.getDiagnosisId())
                .userId(diagnosis.getUserId())
                .cropName(diagnosis.getCropName())
                .photoUrl(publicPhotoUrl)
                .diseaseName(diagnosis.getDiseaseName())
                .recommendation(diagnosis.getRecommendation())
                .createdAt(diagnosis.getCreatedAt())
                .build();
    }
}
