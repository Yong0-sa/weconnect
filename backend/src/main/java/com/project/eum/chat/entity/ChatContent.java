package com.project.eum.chat.entity;

import com.project.eum.user.Member;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_contents")
@Getter
@Setter
@NoArgsConstructor
public class ChatContent {

    /**
     * 메시지 하나당 생성되는 PK
     * 예: 1, 2, 3 ... 자동 증가
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "content_id")
    private Long contentId;

    /**
     * 다대일(ManyToOne) - Many(메시지) → One(방)
     * fetch = LAZY: 메시지를 가져올 때 방 정보를 필요할 때만 불러옴
     * optional = false: 반드시 방이 존재해야만 메시지가 저장됨
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    /**
     * 다대일(ManyToOne) - Many(메시지) → One(회원)
     * fetch = LAZY: 메시지를 가져올 때 회원 정보를 필요할 때만 불러옴
     * optional = false: 반드시 발신자가 존재해야만 메시지가 저장됨
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender", nullable = false)
    private Member sender;

    /**
     * 실제 채팅 메시지 텍스트
     */    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * 메시지가 생성된 시간
     * - Hibernate가 자동으로 현재 시각을 넣어줌
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
