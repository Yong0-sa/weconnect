package com.project.eum.shop;

import com.project.eum.dto.ShopCatalogItemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/**
 * DB에서 아이템을 조회해 프론트가 바로 사용할 수 있는 형태로 가공한다.
 */
@Service
@RequiredArgsConstructor
public class ShopItemService {

    private final ShopItemRepository shopItemRepository;

    @Transactional(readOnly = true)
    public List<ShopCatalogItemResponse> getCatalogItems() {
        List<ShopItem> rows = shopItemRepository.findAll();
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<String, ShopItemAggregate> aggregated = new LinkedHashMap<>();
        for (ShopItem row : rows) {
            String key = deriveBaseKey(row);
            ShopItemAggregate aggregate = aggregated.computeIfAbsent(key, k -> new ShopItemAggregate());
            aggregate.absorb(row, this::normalizeAssetPath);
        }

        return aggregated.values().stream()
                .map(aggregate -> aggregate.toResponse(this::normalizeAssetPath))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingLong(ShopCatalogItemResponse::price))
                .toList();
    }

    private String deriveBaseKey(ShopItem item) {
        if (item == null || item.getItemName() == null) {
            return "";
        }
        String key = item.getItemName().trim();
        String category = item.getItemCategory();
        if (category == null) {
            return key;
        }
        String lower = category.toLowerCase(Locale.ROOT);
        if ("equip".equals(lower)) {
            return key.replace(" 장착", "").replace("장착", "").trim();
        }
        if ("animation".equals(lower)) {
            return key
                    .replace(" 애니메이션", "")
                    .replace("애니메이션", "")
                    .replace(" 동영상", "")
                    .replace("동영상", "")
                    .trim();
        }
        return key;
    }

    private String normalizeAssetPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return null;
        }
        String path = rawPath.trim();
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private static final class ShopItemAggregate {
        private ShopItem toolItem;
        private String equipPhotoUrl;
        private String animationUrl;

        void absorb(ShopItem item, Function<String, String> assetNormalizer) {
            if (item == null) {
                return;
            }
            String category = item.getItemCategory();
            if (category == null || category.equalsIgnoreCase("tool")) {
                this.toolItem = item;
                return;
            }
            if (category.equalsIgnoreCase("equip")) {
                this.equipPhotoUrl = assetNormalizer.apply(item.getPhotoUrl());
                return;
            }
            if (category.equalsIgnoreCase("animation")) {
                this.animationUrl = assetNormalizer.apply(item.getPhotoUrl());
            }
        }

        ShopCatalogItemResponse toResponse(Function<String, String> assetNormalizer) {
            if (toolItem == null) {
                return null;
            }
            long price = toolItem.getItemPrice() != null ? toolItem.getItemPrice() : 0L;
            return new ShopCatalogItemResponse(
                    toolItem.getId(),
                    toolItem.getItemName(),
                    price,
                    toolItem.getItemInfo(),
                    assetNormalizer.apply(toolItem.getPhotoUrl()),
                    equipPhotoUrl,
                    animationUrl
            );
        }
    }
}
