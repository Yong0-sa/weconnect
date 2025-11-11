package com.project.eum.dto;

public record UpdateProfileRequest(
        String nickname,
        String currentPassword,
        String newPassword
) {
}
