package com.project.eum.dto;

public record UpdateProfileRequest(
        String email,
        String nickname,
        String name,
        String phone,
        String currentPassword,
        String newPassword
) {
}
