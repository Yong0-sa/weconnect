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

    private final ChatRoomService chatRoomService;
    private final ChatMessageService chatMessageService;

    @GetMapping("/rooms")
    public ResponseEntity<?> myRooms(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }
        List<ChatRoomResponse> responses = chatRoomService.myRooms(memberId);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@Valid @RequestBody CreateChatRoomRequest request,
                                        HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }
        ChatRoomResponse response = chatRoomService.ensureRoom(
                memberId,
                request.farmId(),
                request.farmerId(),
                request.userId()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> recentMessages(@PathVariable Long roomId, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }
        List<ChatMessageResponse> messages = chatMessageService.getRecentMessages(roomId, memberId);
        return ResponseEntity.ok(messages);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
