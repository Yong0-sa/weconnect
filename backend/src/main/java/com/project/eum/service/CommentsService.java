package com.project.eum.service;

import com.project.eum.comments.Comments;
import com.project.eum.comments.CommentsRepository;
import com.project.eum.dto.CommentsRequest;
import com.project.eum.dto.CommentsResponseDto;
import com.project.eum.dto.CommentsUpdateRequest;
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

    public List<CommentsResponseDto> getCommentsByPostId(Long postId) {
        List<Comments> comments = commentsRepository.findByPost_PostId(postId);
        return comments.stream()
                .map(c -> new CommentsResponseDto(
                        c.getCommentId(),
                        c.getPost().getPostId(),
                        c.getAuthor().getUserId(),
                        c.getAuthor().getNickname(),
                        c.getContent(),
                        c.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
@Transactional
    public CommentsResponseDto createComment(CommentsRequest request) {
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));
        Member author = memberRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new IllegalArgumentException("사용자가 존재하지 않습니다."));

        Comments comment = Comments.builder()
                .post(post)
                .author(author)
                .content(request.getContent())
                .build();
        Comments savedComment = commentsRepository.save(comment);
        System.out.println(savedComment.getCommentId());
        System.out.println(savedComment.getPost().getPostId());
        System.out.println(savedComment.getAuthor().getUserId());
        System.out.println(savedComment.getContent());

        Long postId = savedComment.getPost().getPostId();
        Long authorId = savedComment.getAuthor().getUserId();
        String nickname = savedComment.getAuthor().getNickname();
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


        Long postId = savedComment.getPost().getPostId();
        Long authorId = savedComment.getAuthor().getUserId();
        String nickname = savedComment.getAuthor().getNickname();
        System.out.println("Updated Comment: " + savedComment);

        return new CommentsResponseDto(
                savedComment.getCommentId(),
                savedComment.getPost().getPostId(),
                savedComment.getAuthor().getUserId(),
                savedComment.getAuthor().getNickname(),
                savedComment.getContent(),
                savedComment.getCreatedAt()
        );

    }



    public void deleteComment(Long commentId, Long requesterId) {
        Comments comment = commentsRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));

        if (!comment.getAuthor().getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("작성자만 삭제할 수 있습니다.");
        }

        commentsRepository.delete(comment);

    }


}


