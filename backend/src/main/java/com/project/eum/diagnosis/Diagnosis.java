package com.project.eum.diagnosis;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 작물 진단 결과 엔티티
 * AI 진단 결과를 저장합니다.
 */
@Entity
@Table(name = "diagnoses")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Diagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "diagnosis_id")
    private Long diagnosisId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "crop_name", nullable = false, length = 50)
    private String cropName;

    @Column(name = "photo_url", nullable = false, length = 255)
    private String photoUrl;

    @Column(name = "disease_name", nullable = false, length = 255)
    private String diseaseName;

    @Column(name = "recommendation", nullable = false, length = 1000)
    private String recommendation;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}


