package com.project.eum.chat.repository;

import com.project.eum.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


/**
 * 채팅방(ChatRoom) 관련 DB 접근을 담당하는 JPA 레포지토리
 * - 기본 CRUD 기능은 JpaRepository가 자동 제공
 * - 필요한 조회 메서드만 추가로 정의
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /**
     * 농장(farmId) + 농장주(farmerId) + 사용자(userId) 조합으로
     * 이미 존재하는 채팅방이 있는지 조회
     *
     * - 방이 하나만 존재해야 하므로 Optional로 반환됨
     * - 채팅방 중복 생성을 막는 데 사용됨
     */
    Optional<ChatRoom> findByFarmFarmIdAndFarmerUserIdAndUserUserId(Long farmId, Long farmerId, Long userId);

    /**
     * 특정 회원(농장주 또는 사용자)이 참여한 모든 채팅방을
     * 최근 수정 시간(updatedAt) 내림차순으로 조회
     *
     * - farmerId 또는 userId로 참여 여부 확인
     * - 방 목록 화면에서 사용됨
     */
    List<ChatRoom> findByFarmerUserIdOrUserUserIdOrderByUpdatedAtDesc(Long farmerId, Long userId);
}
