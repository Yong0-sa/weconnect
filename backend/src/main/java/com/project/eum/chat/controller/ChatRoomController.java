package com.project.eum.chat.controller;

import com.project.eum.chat.dto.ChatMessageResponse;
import com.project.eum.chat.dto.ChatRoomResponse;
import com.project.eum.chat.dto.CreateChatRoomRequest;
import com.project.eum.chat.service.ChatMessageService;
import com.project.eum.chat.service.ChatRoomService;
import com.project.eum.config.SessionConst;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/chat", "/chat"})
@RequiredArgsConstructor
public class ChatRoomController {

    // 채팅방 관리 서비스
    private final ChatRoomService chatRoomService;
    
    // 채팅 메시지 관리 서비스(방의 최근 메시지 조회 등에 사용)
    private final ChatMessageService chatMessageService;

    /**
     * 로그인한 사용자가 참여 중인 채팅방 목록 조회
     * - 세션에서 로그인 사용자 ID 가져오기
     * - 로그인 안 되어 있으면 401 반환
     * - 참여 중인 채팅방 리스트 반환
     */
    @GetMapping("/rooms")
    public ResponseEntity<?> myRooms(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }
        List<ChatRoomResponse> responses = chatRoomService.myRooms(memberId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 채팅방 생성 요청
     * - 이미 있는 조합이면 기존 방을 반환
     * - 없는 조합이면 새로운 방 생성
     * - (farmId, farmerId, userId 조합 기반)
     */
    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@Valid @RequestBody CreateChatRoomRequest request,
                                        HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        // 방이 있으면 그대로 반환, 없으면 생성
        ChatRoomResponse response = chatRoomService.ensureRoom(
                memberId,
                request.farmId(),
                request.farmerId(),
                request.userId()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * 특정 채팅방의 최근 메시지 조회
     * - 세션에서 로그인 사용자 ID 가져오기
     * - 로그인 안 되어 있으면 401 반환
     * - 해당 방의 최근 메시지 리스트 반환
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> recentMessages(@PathVariable Long roomId, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        // 최근 메시지 (예: 최신 50개) 조회
        List<ChatMessageResponse> messages = chatMessageService.getRecentMessages(roomId, memberId);
        return ResponseEntity.ok(messages);
    }

    /**
     * 잘못된 파라미터나 값으로 인해 IllegalArgumentException 발생할 때 처리
     * - 400 Bad Request로 에러 메시지 반환
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
