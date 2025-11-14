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

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    @Builder.Default
    private List<RagQueryLog> ragQueryLogs = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id")
    private Farm farm;

    @Column(name = "farm_prompt_shown", nullable = false)
    @Builder.Default
    private boolean farmPromptShown = false;
}
