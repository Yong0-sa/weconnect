package com.project.eum.user;

import com.project.eum.ai.entity.RagQueryLog;
import com.project.eum.farm.Farm;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 서비스 전반에서 사용하는 핵심 사용자 엔티티.
 * - 로그인/권한/프로필/농장/AI 로그 등 공통 데이터 포함
 */
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_nickname", columnList = "nickname", unique = true)
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Member {

    // 서비스 전반에서 참조하는 사용자 영속 엔티티
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    // 로그인 식별에 필요한 계정 정보
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 255, name = "password_hash")
    private String passwordHash;

    @Column(nullable = false, unique = true, length = 50)
    private String nickname;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private UserRole role = UserRole.USER;

    // 코인 적립/차감 시 참조하는 누적 값
    @Column(name = "coin_balance", nullable = false)
    @Builder.Default
    private Long coinBalance = 0L;

    // 레코드 생성/수정 시점을 자동으로 기록한다
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /* ============================================================
       AI 질의 로그 (1:N)
       - 유저가 AI 정보검색/RAG 질의할 때 저장됨
       - 유저 삭제 시 함께 삭제(cascade + orphanRemoval)
       ============================================================ */
    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    @Builder.Default
    private List<RagQueryLog> ragQueryLogs = new ArrayList<>();

    /* ============================================================
       농장 정보 (N:1)
       - 일반 사용자: null
       - 농장주(FARMER): 본인의 Farm 연결
       ============================================================ */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id")
    private Farm farm;

    /* ============================================================
       온보딩 플래그
       - 첫 로그인 시 “농장 등록 안내 모달” 표시 여부 저장
       ============================================================ */
    @Column(name = "farm_prompt_shown", nullable = false)
    @Builder.Default
    private boolean farmPromptShown = false;
}
