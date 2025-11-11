package com.project.eum.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
  // 단순한 조회/검증 쿼리는 Spring Data 메서드 이름으로 정의한다
  boolean existsByEmail(String email);
  boolean existsByNickname(String nickname);
  Optional<Member> findByEmail(String email);
  boolean existsByNicknameAndUserIdNot(String nickname, Long userId);
  boolean existsByEmailAndUserIdNot(String email, Long userId);
}
