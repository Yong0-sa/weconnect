package com.project.eum.chat.repository;

import com.project.eum.chat.entity.ChatContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 채팅 메시지 저장/조회용 JPA 레포지토리
 *
 * - JpaRepository<ChatContent, Long> : 기본 CRUD 자동 제공
 * - 추가 메서드로 최근 메시지 50개 조회 기능 제공
 */
public interface ChatContentRepository extends JpaRepository<ChatContent, Long> {

    /**
     * 특정 채팅방의 최근 50개 메시지를 contentId 내림차순으로 조회
     * - roomId: 조회할 채팅방 ID
     * - 반환: 최근 50개 ChatContent 엔티티 리스트
     */
    List<ChatContent> findTop50ByRoomRoomIdOrderByContentIdDesc(Long roomId);
}
