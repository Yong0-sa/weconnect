package com.project.eum.comments;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentsRepository extends JpaRepository<Comments, Long> {
    // 특정 게시글의 댓글 전체 조회
    List<Comments> findByPost_PostId(Long postId);

    // 필요시 추가 쿼리 메서드 작성 가능
}
