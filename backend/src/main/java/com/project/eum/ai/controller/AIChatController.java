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

    // 사용자의 질문을 받아 AI에게 물어보고, 결과를 로그로 저장한 뒤 응답 객체로 반환하는 엔드포인트.
    @PostMapping
    public ResponseEntity<?> ask(@Valid @RequestBody AIChatRequest request, HttpSession session) {
        // 세션에서 로그인된 회원 ID를 꺼냄 (로그인이 되어 있지 않으면 null)
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        
        // 로그인하지 않은 사용자는 401 응답
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        try {
             // AI 서버에 질문을 보내고, RAG 로그 엔티티(RagQueryLog)에 질의/응답/메타정보를 저장
            RagQueryLog log = aiChatService.askAndLog(userId, request);
            // 저장된 로그 엔티티를 응답용 DTO(AIChatExchangeResponse)로 변환하여 반환
            return ResponseEntity.ok(AIChatExchangeResponse.from(log));
        
        } catch (AiServerException ex) {
            // 내부 AI 서버(FastAPI 등)와의 통신 실패, 응답 에러 등의 경우
            // 클라이언트에게는 502 Bad Gateway로 내려줌
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ex.getMessage());
        
        } catch (IllegalArgumentException ex) {
            // 서비스 로직이나 파라미터 검증 과정에서 잘못된 인자가 들어온 경우
            // 클라이언트 책임이므로 400 Bad Request로 응답
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    // 해당 사용자의 AI 대화 이력(RagQueryLog)을 조회하는 엔드포인트.
    @GetMapping("/history")
    public ResponseEntity<?> history(@RequestParam(name = "limit", required = false) Integer limit,
                                     HttpSession session) {
        // 세션에서 로그인된 회원 ID를 꺼냄
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        
        // 로그인하지 않은 경우 401 응답
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        // 서비스 계층에서 해당 사용자의 최근 질의/응답 로그를 limit 개수만큼 가져옴
        List<RagQueryLog> logs = aiChatService.fetchHistory(userId, limit);
        
        // 엔티티 리스트를 응답 DTO 리스트로 변환하여 반환
        return ResponseEntity.ok(logs.stream().map(AIChatExchangeResponse::from).toList());
    }
}

