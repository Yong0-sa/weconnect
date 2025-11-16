package com.project.eum.farm;

import com.project.eum.user.Member;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 농장(Farm) 정보를 저장하는 엔티티.
 * - 농장명, 주소, 좌표, 연락처 포함
 * - owner(Member)와 다대일(N:1) 관계
 */
@Entity
@Table(name = "farms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Farm {

    // 농장 PK (자동 증가)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "farm_id")
    private Long farmId;

    // 농장 소유자 (Member 엔티티 FK) 
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private Member owner;

    // 농장 이름
    @Column(nullable = false, length = 100)
    private String name;

    // 시/도 정보 (예: 서울특별시, 경기도)
    @Column(nullable = false, length = 100)
    private String city;

    // 도로명 주소
    @Column(nullable = false, length = 255)
    private String address;

    // 위도 (예: 37.12345678)
    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    // 경도 (예: 126.12345678)
    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    // 농장 연락처
    @Column(length = 20)
    private String tel;

    // 등록일시 (자동 생성, 수정 불가)
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
