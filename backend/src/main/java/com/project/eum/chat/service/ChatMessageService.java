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

    public ChatMessageResponse sendMessage(Long senderId, Long roomId, String content) {
        if (senderId == null) {
            throw new IllegalArgumentException("로그인 후 이용해 주세요.");
        }
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("메시지 내용을 입력해 주세요.");
        }

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        if (!room.isParticipant(senderId)) {
            throw new IllegalArgumentException("채팅방 참여자만 메시지를 보낼 수 있습니다.");
        }

        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        ChatContent contentEntity = new ChatContent();
        contentEntity.setRoom(room);
        contentEntity.setSender(sender);
        contentEntity.setContent(content.trim());

        ChatContent saved = chatContentRepository.save(contentEntity);
        room.setLastMessageAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now());
        return ChatMessageResponse.from(saved);
    }

    @Transactional
    public List<ChatMessageResponse> getRecentMessages(Long roomId, Long requesterId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));
        if (!room.isParticipant(requesterId)) {
            throw new IllegalArgumentException("채팅방 참여자만 메시지를 조회할 수 있습니다.");
        }
        List<ChatContent> latest = chatContentRepository
                .findTop50ByRoomRoomIdOrderByContentIdDesc(roomId);
        Collections.reverse(latest);
        return latest.stream().map(ChatMessageResponse::from).toList();
    }
}
