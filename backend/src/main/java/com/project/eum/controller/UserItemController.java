package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.UserInventoryResponse;
import com.project.eum.dto.UserItemEquipRequest;
import com.project.eum.dto.UserItemEquipResponse;
import com.project.eum.dto.UserItemPurchaseRequest;
import com.project.eum.dto.UserItemPurchaseResponse;
import com.project.eum.dto.UserItemUnequipRequest;
import com.project.eum.shop.UserItemService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자 보유 아이템/장비 관련 REST 컨트롤러.
 */
@RestController
@RequestMapping({"/api/user-items", "/user-items"})
@RequiredArgsConstructor
public class UserItemController {

    private final UserItemService userItemService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyItems(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        UserInventoryResponse response = userItemService.getInventory(memberId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> purchaseItem(@RequestBody UserItemPurchaseRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (request == null || request.itemId() == null) {
            return ResponseEntity.badRequest().body("구매할 아이템을 선택해 주세요.");
        }
        try {
            UserItemPurchaseResponse response = userItemService.purchaseItem(memberId, request.itemId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/equip")
    public ResponseEntity<?> equipItem(@RequestBody UserItemEquipRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (request == null || request.itemId() == null) {
            return ResponseEntity.badRequest().body("장착할 아이템을 선택해 주세요.");
        }
        try {
            UserItemEquipResponse response = userItemService.equipItem(memberId, request.itemId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/unequip")
    public ResponseEntity<?> unequipItem(@RequestBody(required = false) UserItemUnequipRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        Long itemId = request != null ? request.itemId() : null;
        String category = request != null ? request.category() : null;
        try {
            UserItemEquipResponse response = userItemService.unequip(memberId, itemId, category);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
