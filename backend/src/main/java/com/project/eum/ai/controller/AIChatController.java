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

@RestController
@RequestMapping({"/api/ai/chat", "/ai/chat"})
@RequiredArgsConstructor
public class AIChatController {

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

