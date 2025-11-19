package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.ReplyCreateRequest;
import com.project.eum.dto.ReplyResponse;
import com.project.eum.dto.ReplyUpdateRequest;
import com.project.eum.service.ReplyService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/replies","/replies"})
@RequiredArgsConstructor
public class ReplyController {

    private final ReplyService replyService;

    /**
     * 답글 작성
     * POST /api/replies
     */
    @PostMapping
    public ResponseEntity<?> createReply(
            @Valid @RequestBody ReplyCreateRequest request,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        try {
            ReplyResponse response = replyService.createReply(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    /**
     * 특정 댓글의 답글 목록 조회
     * GET /api/replies?commentId={commentId}
     */
    @GetMapping
    public ResponseEntity<?> getRepliesByComment(@RequestParam Long commentId) {
        try {
            List<ReplyResponse> replies = replyService.getRepliesByCommentId(commentId);
            return ResponseEntity.ok(replies);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    /**
     * 답글 수정
     * PUT /api/replies/{replyId}?requesterId={requesterId}
     */
    @PutMapping("/{replyId}")
    public ResponseEntity<?> updateReply(
            @PathVariable Long replyId,
            @RequestParam Long requesterId,
            @Valid @RequestBody ReplyUpdateRequest request,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        try {
            ReplyResponse response = replyService.updateReply(replyId, requesterId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    /**
     * 답글 삭제
     * DELETE /api/replies/{replyId}?requesterId={requesterId}
     */
    @DeleteMapping("/{replyId}")
    public ResponseEntity<?> deleteReply(
            @PathVariable Long replyId,
            @RequestParam Long requesterId,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }

        try {
            replyService.deleteReply(replyId, requesterId);
            return ResponseEntity.ok("답글이 삭제되었습니다.");
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }
}