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

    /**
     * 채팅방 고유 ID (PK)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long roomId;

    /**
     * 채팅방이 연결된 농장, 농장주, 사용자 정보
     * - 다대일(ManyToOne) 관계(여러 방이 하나의 농장에 속할 수 있음)
     * - farm_id 컬럼(FK)을 사용함
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    /**
     * 농장주(판매자) 정보
     * - 한 명의 농장주가 여러 채팅방을 가질 수 있으므로 N:1
     * - farmer_id 컬럼(FK)을 사용
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Member farmer;

    /**
     * 구매자(일반 유저) 정보
     * - 한 명의 사용자도 여러 채팅방을 가질 수 있음 (N:1)
     * - user_id 컬럼(FK) 사용
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Member user;

    /**
     * 마지막 메시지 전송 시간
     * - 채팅방 목록 정렬 등에 사용됨
     */
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message_preview", length = 500)
    private String lastMessagePreview;

    @Column(name = "farmer_last_read_at")
    private LocalDateTime farmerLastReadAt;

    @Column(name = "user_last_read_at")
    private LocalDateTime userLastReadAt;

    /**
     * 채팅방 상태 (활성/비활성)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

    /**
     * 생성 및 수정 시간
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 마지막 수정 시간
     */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 특정 회원이 이 채팅방의 참여자인지 확인하는 메서드
     * - 농장주 또는 사용자인지 체크
     * - memberId가 null이면 false 반환
     */
    public boolean isParticipant(Long memberId) {
        if (memberId == null) {
            return false;
        }
        return isFarmer(memberId) || isUser(memberId);
    }

    public boolean isFarmer(Long memberId) {
        if (memberId == null) {
            return false;
        }
        return farmer != null && memberId.equals(farmer.getUserId());
    }

    public boolean isUser(Long memberId) {
        if (memberId == null) {
            return false;
        }
        return user != null && memberId.equals(user.getUserId());
    }

    public void markRead(Long memberId, LocalDateTime readAt) {
        LocalDateTime timestamp = readAt != null ? readAt : LocalDateTime.now();
        if (isFarmer(memberId)) {
            this.farmerLastReadAt = timestamp;
        } else if (isUser(memberId)) {
            this.userLastReadAt = timestamp;
        }
    }
}
