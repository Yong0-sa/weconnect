package com.project.eum.shop;

import com.project.eum.user.Member;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * 사용자가 상점에서 획득한 아이템.
 */
@Entity
@Table(name = "user_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Member user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private ShopItem shopItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private UserItemStatus status = UserItemStatus.UNEQUIPPED;

    @Column(name = "item_category", length = 100)
    private String itemCategory;

    @Column(name = "acquired_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant acquiredAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (acquiredAt == null) {
            acquiredAt = Instant.now();
        }
    }
}
