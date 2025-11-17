package com.project.eum.controller;

import com.project.eum.dto.CommentsRequest;
import com.project.eum.dto.CommentsResponseDto;
import com.project.eum.dto.CommentsUpdateRequest;
import com.project.eum.service.CommentsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentsController {

    private final CommentsService commentsService;

    // 댓글 보기
    @GetMapping
    public List<CommentsResponseDto> getComments(@RequestParam Long postId) {
        return commentsService.getCommentsByPostId(postId);
    }

    // 댓글 작성
    @PostMapping
    public CommentsResponseDto createComment(@RequestBody CommentsRequest request) {
        return commentsService.createComment(request);
    }

    // 댓글 수정
    @PutMapping("/{commentId}")
    public CommentsResponseDto updateComment(
            @PathVariable Long commentId,
            @RequestParam Long requesterId,
            @RequestBody CommentsUpdateRequest request
    ) {
        return commentsService.updateComment(commentId, requesterId, request);
    }

    // 댓글 삭제
    @DeleteMapping("/{commentId}")
    public ResponseEntity<String> deleteComment(
            @PathVariable Long commentId,
            @RequestParam Long requesterId
    ) {
        commentsService.deleteComment(commentId, requesterId);
        return ResponseEntity.ok("댓글이 삭제되었습니다.");
    }
}
