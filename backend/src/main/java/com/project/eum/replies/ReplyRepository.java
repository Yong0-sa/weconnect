package com.project.eum.replies;

import com.project.eum.replies.Reply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReplyRepository extends JpaRepository<Reply, Long> {

    // 특정 댓글의 모든 답글 조회
    List<Reply> findByCommentCommentIdOrderByCreatedAtAsc(Long commentId);

    // 특정 사용자가 작성한 모든 답글 조회
    List<Reply> findByAuthorUserIdOrderByCreatedAtDesc(Long userId);
}
