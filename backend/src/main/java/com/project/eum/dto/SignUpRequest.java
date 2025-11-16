package com.project.eum.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.project.eum.user.MemberType;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * 회원가입 요청 DTO.
 * - 클라이언트가 입력한 기본 프로필 정보를 서버로 전달
 * - 이메일/비밀번호/전화번호 등 유효성 검사 포함
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpRequest {

    // 이메일 (필수, 형식 검사)
    @Email
    @NotBlank
    private String email;

    // 닉네임 (필수)
    @NotBlank
    private String nickname;

    // 비밀번호 (필수, 최소 8자)
    @NotBlank
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    private String password;

    // 사용자 이름
    @NotBlank
    private String name;

    // 전화번호 (필수, 한국/국제번호 형식 허용)
    @NotBlank
    @Pattern(
            regexp = "^(\\+?\\d{1,3}[- ]?)?\\d{2,3}[- ]?\\d{3,4}[- ]?\\d{4}$",
            message = "010-1234-5678 또는 +82-10-1234-5678 형식으로 입력해 주세요."
    )
    private String phone;

    // 회원 유형 (개인 / 농장주 / 관리자)
    @NotNull
    private MemberType memberType;  // PERSONAL / FARMER / ADMIN

}
