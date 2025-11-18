package com.project.eum.service;

import com.project.eum.dto.PostCreateRequest;
import com.project.eum.dto.PostResponseDto;
import com.project.eum.dto.PostUpdateRequest;
import com.project.eum.farm.Farm;
import com.project.eum.farm.FarmRepository;
import com.project.eum.farm.contract.FarmContractRepository;
import com.project.eum.farm.contract.FarmContractStatus;
import com.project.eum.post.Post;
import com.project.eum.post.PostRepository;
import com.project.eum.post.PostType;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

    private final PostRepository postRepository;
    private final FarmRepository farmRepository;
    private final MemberRepository memberRepository;
    private final FarmContractRepository farmContractRepository;
    private final ObjectStorageService objectStorageService;

    // 농장주인지 확인
    private boolean isFarmOwner(Long userId, Long farmId) {
        return farmRepository.findById(farmId)
                .map(farm -> farm.getOwner().getUserId().equals(userId))
                .orElse(false);
    }

    // 승인된 회원인지 확인
    private boolean isApprovedMember(Long userId, Long farmId) {
        return farmContractRepository
                .findByUserUserIdAndFarmFarmIdAndStatus(userId, farmId, FarmContractStatus.APPROVED)
                .isPresent();
    }

    // 글 작성 권한 확인
    private void validatePostWritePermission(Long userId, Long farmId, PostType type) {
        boolean isOwner = isFarmOwner(userId, farmId);

        if (type == PostType.NOTICE && !isOwner) {
            throw new IllegalStateException("공지사항은 농장주만 작성할 수 있습니다.");
        }

        if (type == PostType.GENERAL) {
            if (!isOwner && !isApprovedMember(userId, farmId)) {
                throw new IllegalStateException("승인된 회원만 글을 작성할 수 있습니다.");
            }
        }
    }

    private void validatePostModifyPermission(Post post, Long requesterId) {
        if (post.getType() == PostType.NOTICE) {
            if (!isFarmOwner(requesterId, post.getFarm().getFarmId())) {
                throw new IllegalArgumentException("해당 농장주만 공지사항을 수정하거나 삭제할 수 있습니다.");
            }
        } else {
            if (!post.getAuthor().getUserId().equals(requesterId)) {
                throw new IllegalArgumentException("작성자만 수정하거나 삭제할 수 있습니다.");
            }
        }
    }

    // 게시글 작성
    @Transactional
    public PostResponseDto createPost(PostCreateRequest request, MultipartFile imageFile) {
        var author = memberRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new IllegalArgumentException("작성자 없음"));
        var farm = farmRepository.findById(request.getFarmId())
                .orElseThrow(() -> new IllegalArgumentException("농장 없음"));

        // type이 null이면 기본값 GENERAL 사용
        PostType postType = request.getType() != null ? request.getType() : PostType.GENERAL;

        // 권한 검증
        validatePostWritePermission(author.getUserId(), farm.getFarmId(), postType);

        String photoUrl = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            validateImageSize(imageFile);
            photoUrl = objectStorageService.uploadCommunityImage(imageFile, author.getUserId());
        } else if (StringUtils.hasText(request.getPhotoUrl())) {
            photoUrl = request.getPhotoUrl();
        }

        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .photoUrl(photoUrl)
                .type(postType)
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

        validatePostModifyPermission(post, requesterId);

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());

        return new PostResponseDto(postRepository.save(post));
    }

    // 게시글 삭제
    @Transactional
    public void deletePost(Long postId, Long requesterId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글 없음"));

        validatePostModifyPermission(post, requesterId);

        postRepository.delete(post);
    }

    // 전체 게시글 조회
    public List<PostResponseDto> getAllPosts() {
        return postRepository.findAll().stream()
                .map(PostResponseDto::new)
                .collect(Collectors.toList());
    }

    private void validateImageSize(MultipartFile imageFile) {
        if (imageFile.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("이미지 크기는 5MB 이하여야 합니다. 현재 크기: " + (imageFile.getSize() / 1024) + "KB");
        }
    }
}
