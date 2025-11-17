package com.project.eum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 농장 정보 수정 요청 DTO.
 * - 농장주 계정관리 모달에서 입력한 내용을 백엔드로 전달한다.
 * - 위경도는 직접 입력하지 않으면 null 로 전달되어 주소를 기반으로 재계산된다.
 */
public record UpdateFarmRequest(
        @NotBlank(message = "농장 이름을 입력해 주세요.")
        String name,

        @NotBlank(message = "농장 주소를 입력해 주세요.")
        String address,

        @NotBlank(message = "농장 전화번호를 입력해 주세요.")
        @Size(max = 20, message = "전화번호는 20자 이하로 입력해 주세요.")
        String tel
) {
}
