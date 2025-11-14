package com.project.eum.chat.entity;

import com.project.eum.farm.Farm;
import com.project.eum.user.Member;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_rooms",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_chat_room_participants",
                columnNames = {"farm_id", "farmer_id", "user_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long roomId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Member farmer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Member user;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public boolean isParticipant(Long memberId) {
        if (memberId == null) {
            return false;
        }
        Long farmerId = farmer != null ? farmer.getUserId() : null;
        Long userId = user != null ? user.getUserId() : null;
        return memberId.equals(farmerId) || memberId.equals(userId);
    }
}
