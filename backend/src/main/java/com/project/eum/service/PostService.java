package com.project.eum.service;

import com.project.eum.dto.PostCreateRequest;
import com.project.eum.dto.PostResponseDto;
import com.project.eum.dto.PostUpdateRequest;
import com.project.eum.farm.FarmRepository;
import com.project.eum.post.Post;
import com.project.eum.post.PostRepository;
import com.project.eum.user.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final FarmRepository farmRepository;
    private final MemberRepository memberRepository;

    // 게시글 작성
    @Transactional
    public PostResponseDto createPost(PostCreateRequest request) {
        var author = memberRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new IllegalArgumentException("작성자 없음"));
        var farm = farmRepository.findById(request.getFarmId())
                .orElseThrow(() -> new IllegalArgumentException("농장 없음"));

        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .photoUrl(request.getPhotoUrl())
                .author(author)
                .farm(farm)
                .build();

        return new PostResponseDto(postRepository.save(post));
    }

    // 게시글 수정
    @Transactional
    public PostResponseDto updatePost(Long postId, PostUpdateRequest request, Long requesterId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글 없음"));

        if (!post.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("작성자만 수정 가능");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());

        return new PostResponseDto(postRepository.save(post));
    }

    // 게시글 삭제
    @Transactional
    public void deletePost(Long postId, Long requesterId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글 없음"));

        if (!post.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("작성자만 삭제 가능");
        }

        postRepository.delete(post);
    }

    // 전체 게시글 조회
    public List<PostResponseDto> getAllPosts() {
        return postRepository.findAll().stream()
                .map(PostResponseDto::new)
                .collect(Collectors.toList());
    }
}
