package com.project.eum.controller;

import com.project.eum.dto.PostCreateRequest;
import com.project.eum.dto.PostResponseDto;
import com.project.eum.dto.PostUpdateRequest;
import com.project.eum.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/posts", "/posts"})
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<List<PostResponseDto>> getAllPosts() {
        return ResponseEntity.ok(postService.getAllPosts());
    }

    // ✅ JSON만 받기 (이미지는 나중에 추가)
    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody PostCreateRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(postService.createPost(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("{id}")
    public ResponseEntity<?> updatePost(@PathVariable Long id,
                                        @RequestParam Long requesterId,
                                        @RequestBody PostUpdateRequest request) {
        try {
            return ResponseEntity.ok(postService.updatePost(id, request, requesterId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id,
                                        @RequestParam Long requesterId) {
        try {
            postService.deletePost(id, requesterId);
            return ResponseEntity.ok("게시글이 삭제되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("삭제할 수 없는 게시글입니다. " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("게시글 삭제 중 오류가 발생했습니다.");
        }
    }
}