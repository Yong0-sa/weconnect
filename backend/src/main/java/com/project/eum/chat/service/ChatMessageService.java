package com.project.eum.chat.service;

import com.project.eum.chat.dto.ChatMessageResponse;
import com.project.eum.chat.entity.ChatContent;
import com.project.eum.chat.entity.ChatRoom;
import com.project.eum.chat.repository.ChatContentRepository;
import com.project.eum.chat.repository.ChatRoomRepository;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatMessageService {

    

    private final ChatRoomRepository chatRoomRepository;
    private final ChatContentRepository chatContentRepository;
    private final MemberRepository memberRepository;
    
    /**
     * 메시지 전송 기능
    */
    public ChatMessageResponse sendMessage(Long senderId, Long roomId, String content) {
        if (senderId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("메시지 내용을 입력해 주세요.");
        }

        // 채팅방 존재 여부 및 참여자 확인
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        
        // 메시지 보낼 수 있는 사람인지 확인
        if (!room.isParticipant(senderId)) {
            throw new IllegalArgumentException("채팅방 참여자만 메시지를 보낼 수 있습니다.");
        }

        // 보낸 사람(Member) 조회
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        // 메시지 엔티티 생성 및 내용 설정
        ChatContent contentEntity = new ChatContent();
        contentEntity.setRoom(room);
        contentEntity.setSender(sender);
        contentEntity.setContent(content.trim());

        // 메시지 저장
        ChatContent saved = chatContentRepository.save(contentEntity);
        
        // 방의 마지막 메시지 시간
        LocalDateTime messageTime = saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now();
        room.setLastMessageAt(messageTime);
        room.setLastMessagePreview(contentEntity.getContent());
        room.markRead(senderId, messageTime);
        return ChatMessageResponse.from(saved);
    }

    /**
     * 특정 방의 최근 메시지 50개 조회
     * - 방 존재 여부 확인
     * - 요청자가 참여자인지 확인
     * - 리포지토리로 최근 50개 가져오기
     * - 최근 메시지가 먼저 오므로 reverse() 해서 시간 순으로 정렬
     * - DTO 변환하여 반환
     */
    @Transactional
    public List<ChatMessageResponse> getRecentMessages(Long roomId, Long requesterId) {
        // 방 조회
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        
        // 참여자 여부 확인
        if (!room.isParticipant(requesterId)) {
            throw new IllegalArgumentException("채팅방 참여자만 메시지를 조회할 수 있습니다.");
        }

        // 최신 50개 메시지 가져오기 (내림차순)
        List<ChatContent> latest = chatContentRepository
                .findTop50ByRoomRoomIdOrderByContentIdDesc(roomId);
        // 오래된 메시지가 위로 오도록 정렬 변경
        Collections.reverse(latest);
        
        // DTO 변환
        room.markRead(requesterId, LocalDateTime.now());
        return latest.stream().map(ChatMessageResponse::from).toList();
    }
}
