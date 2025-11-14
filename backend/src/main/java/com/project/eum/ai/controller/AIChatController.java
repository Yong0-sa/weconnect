package com.project.eum.ai.controller;

import com.project.eum.ai.dto.AIChatExchangeResponse;
import com.project.eum.ai.dto.AIChatRequest;
import com.project.eum.ai.entity.RagQueryLog;
import com.project.eum.ai.service.AIChatService;
import com.project.eum.ai.service.AiServerException;
import com.project.eum.config.SessionConst;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * AI 챗봇 대화(질문/응답) 관련 HTTP 요청을 처리하는 컨트롤러.
 * 
 * - POST /api/ai/chat        : 사용자의 질문을 받아 AI 서버에 질의하고, 결과를 로그로 남긴 뒤 응답을 반환
 * - GET  /api/ai/chat/history: 사용자의 대화(질의) 이력을 조회
 *
 * 세션에 로그인된 사용자 ID가 있어야만 접근할 수 있음.
 */
@RestController
@RequestMapping({"/api/ai/chat", "/ai/chat"})
@RequiredArgsConstructor
public class AIChatController {

    // 실제 비즈니스 로직(AI 서버 호출, RAG 로그 저장/조회 등)을 담당
    private final AIChatService aiChatService;

    
    @PostMapping
    public ResponseEntity<?> ask(@Valid @RequestBody AIChatRequest request, HttpSession session) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        try {
            RagQueryLog log = aiChatService.askAndLog(userId, request);
            return ResponseEntity.ok(AIChatExchangeResponse.from(log));
        } catch (AiServerException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ex.getMessage());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(@RequestParam(name = "limit", required = false) Integer limit,
                                     HttpSession session) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        List<RagQueryLog> logs = aiChatService.fetchHistory(userId, limit);
        return ResponseEntity.ok(logs.stream().map(AIChatExchangeResponse::from).toList());
    }
}

