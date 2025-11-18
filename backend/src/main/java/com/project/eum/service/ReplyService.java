package com.project.eum.service;

import com.project.eum.comments.Comments;
import com.project.eum.dto.ReplyCreateRequest;
import com.project.eum.dto.ReplyResponse;
import com.project.eum.dto.ReplyUpdateRequest;
import com.project.eum.replies.Reply;
import com.project.eum.comments.CommentsRepository;
import com.project.eum.replies.ReplyRepository;
import com.project.eum.user.Member;
import com.project.eum.user.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReplyService {

    private final ReplyRepository replyRepository;
    private final CommentsRepository CommentsRepository;
    private final MemberRepository memberRepository;

    /**
     * 답글 작성
     */
    @Transactional
    public ReplyResponse createReply(ReplyCreateRequest request) {
        // 댓글 존재 확인
        Comments comment = CommentsRepository.findById(request.commentId())
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        // 작성자 확인
        Member author = memberRepository.findById(request.authorId())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 답글 생성
        Reply reply = Reply.builder()
                .comment(comment)
                .author(author)
                .content(request.content())
                .build();

        Reply saved = replyRepository.save(reply);
        return ReplyResponse.from(saved);
    }

    /**
     * 특정 댓글의 모든 답글 조회
     */
    @Transactional(readOnly = true)
    public List<ReplyResponse> getRepliesByCommentId(Long commentId) {
        return replyRepository.findByCommentCommentIdOrderByCreatedAtAsc(commentId)
                .stream()
                .map(ReplyResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 답글 수정
     */
    @Transactional
    public ReplyResponse updateReply(Long replyId, Long requesterId, ReplyUpdateRequest request) {
        Reply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new IllegalArgumentException("답글을 찾을 수 없습니다."));

        // 작성자 본인 확인
        if (!reply.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalStateException("본인이 작성한 답글만 수정할 수 있습니다.");
        }

        reply.setContent(request.content());
        return ReplyResponse.from(reply);
    }

    /**
     * 답글 삭제
     */
    @Transactional
    public void deleteReply(Long replyId, Long requesterId) {
        Reply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new IllegalArgumentException("답글을 찾을 수 없습니다."));

        // 작성자 본인 확인
        if (!reply.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalStateException("본인이 작성한 답글만 삭제할 수 있습니다.");
        }

        replyRepository.delete(reply);
    }
}
