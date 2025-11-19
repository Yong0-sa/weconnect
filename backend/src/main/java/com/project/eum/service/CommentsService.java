package com.project.eum.service;

import com.project.eum.comments.Comments;
import com.project.eum.comments.CommentsRepository;
import com.project.eum.dto.CommentsRequest;
import com.project.eum.dto.CommentsResponseDto;
import com.project.eum.dto.CommentsUpdateRequest;
import com.project.eum.dto.ReplyResponse;
import com.project.eum.farm.FarmRepository;
import com.project.eum.farm.contract.FarmContractRepository;
import com.project.eum.farm.contract.FarmContractStatus;
import com.project.eum.post.Post;
import com.project.eum.post.PostRepository;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentsService {

    private final CommentsRepository commentsRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final FarmRepository farmRepository;
    private final FarmContractRepository farmContractRepository;

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

    // 댓글 작성 권한 확인
    private void validateCommentWritePermission(Long userId, Long farmId) {
        boolean isOwner = isFarmOwner(userId, farmId);
        boolean isApproved = isApprovedMember(userId, farmId);

        if (!isOwner && !isApproved) {
            throw new IllegalStateException("승인된 회원만 댓글을 작성할 수 있습니다.");
        }
    }

    public List<CommentsResponseDto> getCommentsByPostId(Long postId) {
        List<Comments> comments = commentsRepository.findByPost_PostId(postId);
        return comments.stream()
                .map(c -> {
                    CommentsResponseDto dto = new CommentsResponseDto(
                        c.getCommentId(),
                        c.getPost().getPostId(),
                        c.getAuthor().getUserId(),
                        c.getAuthor().getNickname(),
                        c.getContent(),
                        c.getCreatedAt()
                );

        if (c.getReplies() != null && !c.getReplies().isEmpty()) {
            List<ReplyResponse> replyList = c.getReplies().stream()
                    .map(ReplyResponse::from)
                    .collect(Collectors.toList());
            dto.setReplies(replyList);
        }

        return dto;
    })

                .collect(Collectors.toList());
    }
@Transactional
    public CommentsResponseDto createComment(CommentsRequest request) {
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));
        Member author = memberRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new IllegalArgumentException("사용자가 존재하지 않습니다."));

        // 권한 검증
        validateCommentWritePermission(author.getUserId(), post.getFarm().getFarmId());

        Comments comment = Comments.builder()
                .post(post)
                .author(author)
                .content(request.getContent())
                .build();
        Comments savedComment = commentsRepository.save(comment);

        return new CommentsResponseDto(
                savedComment.getCommentId(),
                savedComment.getPost().getPostId(),
                savedComment.getAuthor().getUserId(),
                savedComment.getAuthor().getNickname(),
                savedComment.getContent(),
                savedComment.getCreatedAt()


        );


    }
@Transactional
    public CommentsResponseDto updateComment(Long commentId, Long requesterId, CommentsUpdateRequest request) {
        Comments comment = commentsRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));

        if (!comment.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("작성자만 수정할 수 있습니다.");
        }

        comment.setContent(request.getContent());
        Comments savedComment = commentsRepository.save(comment);

        CommentsResponseDto dto = new CommentsResponseDto(
                savedComment.getCommentId(),
                savedComment.getPost().getPostId(),
                savedComment.getAuthor().getUserId(),
                savedComment.getAuthor().getNickname(),
                savedComment.getContent(),
                savedComment.getCreatedAt()
        );
    if (savedComment.getReplies() != null && !savedComment.getReplies().isEmpty()) {
        List<ReplyResponse> replyList = savedComment.getReplies().stream()
                .map(ReplyResponse::from)
                .collect(Collectors.toList());
        dto.setReplies(replyList);
    }

    return dto;
    }


    @Transactional
    public void deleteComment(Long commentId, Long requesterId) {
        Comments comment = commentsRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));

        if (!comment.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("작성자만 삭제할 수 있습니다.");
        }

        commentsRepository.delete(comment);

    }


}


