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

    public ChatRoomResponse ensureRoom(Long requesterId, Long farmId, Long farmerId, Long userId) {
        if (requesterId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }

        ChatRoom existing = chatRoomRepository
                .findByFarmFarmIdAndFarmerUserIdAndUserUserId(farmId, farmerId, userId)
                .orElse(null);
        if (existing != null) {
            validateParticipant(existing, requesterId);
            return ChatRoomResponse.from(existing);
        }

        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 농장입니다."));

        Member farmer = memberRepository.findById(farmerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 농장주입니다."));

        Member user = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        if (!farm.getOwner().getUserId().equals(farmerId)) {
            throw new IllegalArgumentException("농장 정보와 농장주 정보가 일치하지 않습니다.");
        }

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

    @Transactional
    public void touchRoom(Long roomId, LocalDateTime lastMessageAt) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        room.setLastMessageAt(lastMessageAt);
    }

    @Transactional
    public ChatRoom loadRoomForParticipant(Long roomId, Long memberId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        validateParticipant(room, memberId);
        return room;
    }

    @Transactional
    public ChatRoom changeStatus(Long roomId, ChatRoomStatus status, Long requesterId) {
        ChatRoom room = loadRoomForParticipant(roomId, requesterId);
        room.setStatus(status);
        return room;
    }

    @Transactional
    public List<ChatRoomResponse> myRooms(Long requesterId) {
        if (requesterId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }
        List<ChatRoom> rooms = chatRoomRepository
                .findByFarmerUserIdOrUserUserIdOrderByUpdatedAtDesc(requesterId, requesterId);
        return rooms.stream().map(ChatRoomResponse::from).toList();
    }

    private void validateParticipant(ChatRoom room, Long memberId) {
        if (!room.isParticipant(memberId)) {
            throw new IllegalArgumentException("채팅방 참여자만 접근할 수 있습니다.");
        }
    }
}
