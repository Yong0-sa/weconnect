package com.project.eum.chat.controller;

import com.project.eum.chat.dto.ChatMessagePayload;
import com.project.eum.chat.dto.ChatMessageResponse;
import com.project.eum.chat.service.ChatMessageService;
import com.project.eum.config.SessionConst;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class ChatMessageController {

    private static final Logger log = LoggerFactory.getLogger(ChatMessageController.class);

    // 서비스(메시지 저장 및 처리) + WebSocket으로 메시지 보내는 도구
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * WebSocket으로 채팅 메시지 받는 엔드포인트
     * - 클라이언트가 /app/chat.send 로 메시지를 보내면 여기로 옴
     * - 세션에 저장된 로그인 사용자 ID 꺼냄
     * - 메시지 저장 후 같은 방의 구독자들에게 실시간 전송
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessagePayload payload,
                            SimpMessageHeaderAccessor headerAccessor) {
        // WebSocket 세션에서 로그인 ID 가져오기
        Long senderId = headerAccessor.getSessionAttributes() == null
                ? null
                : (Long) headerAccessor.getSessionAttributes().get(SessionConst.LOGIN_MEMBER_ID);

        // 메시지 저장 처리
        ChatMessageResponse response = chatMessageService.sendMessage(
                senderId,
                payload.roomId(),
                payload.content()
        );

        // 해당 방(topic)에 메시지를 실시간으로 뿌림
        messagingTemplate.convertAndSend("/topic/chat/" + response.roomId(), response);
    }

    /**
     * HTTP POST로 채팅 메시지 보내는 엔드포인트
     * - REST 클라이언트용 (WebSocket 연결이 어려운 환경 대비)
     * - URL 경로의 roomId와 본문 payload의 roomId가 일치하는지 검증
     * - 메시지 저장 후 같은 방의 구독자들에게 실시간 전송
     */
    @PostMapping("/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<?> postMessage(@PathVariable Long roomId,
                                         @RequestBody ChatMessagePayload payload,
                                         HttpSession session) {
        // 로그인 체크
        Long senderId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (senderId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        // 본문에 roomId 있으면 확인, 없으면 URL 기준으로 사용
        Long payloadRoomId = payload.roomId() != null ? payload.roomId() : roomId;
        
        // URL의 방 ID와 JSON 방 ID가 다르면 잘못된 요청
        if (!roomId.equals(payloadRoomId)) {
            return ResponseEntity.badRequest().body("요청 경로와 본문의 roomId가 일치하지 않습니다.");
        }

        // 메시지 저장 처리
        ChatMessageResponse response = chatMessageService.sendMessage(senderId, roomId, payload.content());
        
        // 해당 방(topic)에 메시지를 실시간으로 뿌림
        messagingTemplate.convertAndSend("/topic/chat/" + response.roomId(), response);
        
        return ResponseEntity.ok(response);
    }

    /**
     * WebSocket 예외 처리
     * - 메시지 처리 중 오류 발생하면 해당 사용자에게 /user/queue/errors 로 보내줌
     */
    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public String handleWsException(Exception exception) {
        log.warn("Chat message error: {}", exception.getMessage());
        return exception.getMessage();
    }

    /**
     * REST 방식 메시지 전송 중 발생하는 IllegalArgumentException 처리
     * - 예를 들어 roomId 불일치 같은 경우
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Chat message error: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
