package com.project.eum.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Member 엔티티 전용 Repository.
 * - 이메일/닉네임 중복 여부 검사
 * - 이메일로 사용자 조회
 * - 자기 자신 제외 중복 검사 등 회원 관련 검증 로직에 사용
 */
public interface MemberRepository extends JpaRepository<Member, Long> {
  // 이메일/닉네임 중복 검사
  boolean existsByEmail(String email);
  boolean existsByNickname(String nickname);

  // 사용자 조회
  Optional<Member> findByEmail(String email);

  // 자기 자신 제외 중복 검사 (프로필 수정 시 사용)
  boolean existsByNicknameAndUserIdNot(String nickname, Long userId);
  boolean existsByEmailAndUserIdNot(String email, Long userId);
}
