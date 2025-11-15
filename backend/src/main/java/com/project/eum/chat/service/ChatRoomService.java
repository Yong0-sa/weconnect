package com.project.eum.chat.service;

import com.project.eum.chat.dto.ChatRoomResponse;
import com.project.eum.chat.entity.ChatRoom;
import com.project.eum.chat.entity.ChatRoomStatus;
import com.project.eum.chat.repository.ChatRoomRepository;
import com.project.eum.farm.Farm;
import com.project.eum.farm.FarmRepository;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final FarmRepository farmRepository;
    private final MemberRepository memberRepository;

    /**
     * 채팅방 보장(존재 시 반환, 미존재 시 생성)
     * - 농장 + 농장주 + 사용자 조합으로 기존 방 조회
     * - 존재하면 참여자 검증 후 반환
     * - 없으면 농장, 농장주, 사용자 존재 검증 후 새 방 생성
     */
    public ChatRoomResponse ensureRoom(Long requesterId, Long farmId, Long farmerId, Long userId) {
        if (requesterId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }

        // 이미 존재하는 방이 있는지 검사
        ChatRoom existing = chatRoomRepository
                .findByFarmFarmIdAndFarmerUserIdAndUserUserId(farmId, farmerId, userId)
                .orElse(null);
        
        // 기존 방이 있으면 권한 확인 후 그대로 반환
        if (existing != null) {
            validateParticipant(existing, requesterId);
            return ChatRoomResponse.from(existing);
        }

        // 새 방 생성 전 농장/농장주/사용자 존재 여부 검증
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 농장입니다."));

        // 농장 / 농장주 / 사용자 정보 조회
        Member farmer = memberRepository.findById(farmerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 농장주입니다."));

        Member user = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));


        // 농장 정보와 농장주 정보가 일치하는지 체크
        if (!farm.getOwner().getUserId().equals(farmerId)) {
            throw new IllegalArgumentException("농장 정보와 농장주 정보가 일치하지 않습니다.");
        }

        // 요청자가 둘 중 한 명이어야 방 생성 가능
        if (!requesterId.equals(farmerId) && !requesterId.equals(userId)) {
            throw new IllegalArgumentException("채팅방을 생성할 권한이 없습니다.");
        }

        ChatRoom room = new ChatRoom();
        room.setFarm(farm);
        room.setFarmer(farmer);
        room.setUser(user);
        room.setStatus(ChatRoomStatus.ACTIVE);
        room.setLastMessageAt(null);
        ChatRoom saved = chatRoomRepository.save(room);

        return ChatRoomResponse.from(saved);
    }

    /**
     * 방의 마지막 메시지 시간을 갱신
     * (메시지 저장 시 함께 호출됨)
     */
    @Transactional
    public void touchRoom(Long roomId, LocalDateTime lastMessageAt) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        room.setLastMessageAt(lastMessageAt);
    }


    /**
     * 방 조회 + 참여자 권한 확인
     */
    @Transactional
    public ChatRoom loadRoomForParticipant(Long roomId, Long memberId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        validateParticipant(room, memberId);
        return room;
    }


    /**
     * 방 상태 변경 (ACTIVE / CLOSED)
     * - 반드시 참여자만 변경 가능
     */
    @Transactional
    public ChatRoom changeStatus(Long roomId, ChatRoomStatus status, Long requesterId) {
        ChatRoom room = loadRoomForParticipant(roomId, requesterId);
        room.setStatus(status);
        return room;
    }

    /**
     * 내가 속한 모든 채팅방 목록 조회
     * - 농장주(farmer)로 참여한 방
     * - 사용자(user)로 참여한 방
     * 둘 다 한 번에 조회하고 최신순으로 정렬
     */
    @Transactional
    public List<ChatRoomResponse> myRooms(Long requesterId) {
        if (requesterId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }
        List<ChatRoom> rooms = chatRoomRepository
                .findByFarmerUserIdOrUserUserIdOrderByUpdatedAtDesc(requesterId, requesterId);
        return rooms.stream().map(ChatRoomResponse::from).toList();
    }

    // 특정 사용자가 해당 방의 참여자인지 검증
    private void validateParticipant(ChatRoom room, Long memberId) {
        if (!room.isParticipant(memberId)) {
            throw new IllegalArgumentException("채팅방 참여자만 접근할 수 있습니다.");
        }
    }
}
