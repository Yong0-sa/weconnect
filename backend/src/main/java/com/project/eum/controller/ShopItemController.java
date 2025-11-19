package com.project.eum.controller;

import com.project.eum.dto.ShopCatalogItemResponse;
import com.project.eum.shop.ShopItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 상점 아이템 조회 REST 컨트롤러.
 */
@RestController
@RequestMapping({"/api/shop-items", "/shop-items"})
@RequiredArgsConstructor
public class ShopItemController {

    private final ShopItemService shopItemService;

    @GetMapping
    public ResponseEntity<List<ShopCatalogItemResponse>> getCatalogItems() {
        List<ShopCatalogItemResponse> catalogItems = shopItemService.getCatalogItems();
        return ResponseEntity.ok(catalogItems);
    }
}
