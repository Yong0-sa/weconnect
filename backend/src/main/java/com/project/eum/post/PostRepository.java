package com.project.eum.post;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByFarm_FarmId(Long farmId);
    List<Post> findByAuthor_UserId(Long authorId);
}
