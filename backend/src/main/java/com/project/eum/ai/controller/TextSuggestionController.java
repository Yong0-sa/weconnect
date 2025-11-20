package com.project.eum.ai.controller;

import com.project.eum.ai.dto.TextSuggestionRequest;
import com.project.eum.ai.dto.TextSuggestionResponse;
import com.project.eum.ai.service.TextSuggestionService;
import com.project.eum.config.SessionConst;
import com.project.eum.farm.FarmRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 글작성 도우미 컨트롤러
 * 농장주가 공지사항 작성 시 문장 추천 기능 제공
 */
@Slf4j
@RestController
@RequestMapping({"/api/ai/text-suggestions", "/ai/text-suggestions"})
@RequiredArgsConstructor
public class TextSuggestionController {

    private final TextSuggestionService textSuggestionService;
    private final FarmRepository farmRepository;

    /**
     * 문장 추천 API
     * 농장주만 사용 가능 (공지사항 작성 시)
     */
    @PostMapping
    public ResponseEntity<?> getSuggestions(@Valid @RequestBody TextSuggestionRequest request,
                                             HttpSession session) {
        // 1. 세션에서 userId 추출
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
        }

        // 2. farmId로 농장 존재 확인 및 농장주 검증
        boolean isOwner = farmRepository.findById(request.getFarmId())
                .map(farm -> farm.getOwner().getUserId().equals(userId))
                .orElse(false);

        if (!isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("농장주만 이 기능을 사용할 수 있습니다.");
        }

        // 3. AI 서버에 문장 추천 요청
        try {
            TextSuggestionResponse response = textSuggestionService.getSuggestions(request);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("문장 추천 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("문장 추천 중 오류가 발생했습니다.");
        }
    }
}
