package com.project.eum.dto;

/**
 * 클라이언트 상점 모달에서 사용하는 통합 아이템 정보.
 */
public record ShopCatalogItemResponse(
        Long id,
        String name,
        long price,
        String info,
        String photoUrl,
        String equippedPhotoUrl,
        String animationUrl
) {
}
