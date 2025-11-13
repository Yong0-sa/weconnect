package com.project.eum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFarmRequest(
        @NotBlank(message = "농장 이름을 입력해 주세요.")
        String name,

        @NotBlank(message = "농장 주소를 입력해 주세요.")
        String address,

        @NotBlank(message = "농장 전화번호를 입력해 주세요.")
        @Size(max = 20, message = "전화번호는 20자 이하로 입력해 주세요.")
        String tel,

        Double latitude,
        Double longitude,
        String city
) {
}
