package com.project.eum.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.project.eum.user.MemberType;
import jakarta.validation.constraints.*;
import lombok.*;

@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String nickname;

    @NotBlank
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    private String password;

    @NotBlank
    private String name;

    @NotBlank
    @Pattern(
            regexp = "^(\\+?\\d{1,3}[- ]?)?\\d{2,3}[- ]?\\d{3,4}[- ]?\\d{4}$",
            message = "010-1234-5678 또는 +82-10-1234-5678 형식으로 입력해 주세요."
    )
    private String phone;

    @NotNull
    private MemberType memberType;  // PERSONAL / FARMER

    private String farmName;
    private String farmAddress;
}
