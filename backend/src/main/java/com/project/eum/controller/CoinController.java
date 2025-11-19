package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.CoinAddRequest;
import com.project.eum.dto.CoinBalanceResponse;
import com.project.eum.dto.CoinPurchaseRequest;
import com.project.eum.service.CoinService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 코인 잔액 조회/적립/차감 REST 컨트롤러.
 */
@RestController
@RequestMapping({"/api/coins", "/coins"})
@RequiredArgsConstructor
public class CoinController {

    private final CoinService coinService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyCoinBalance(HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        long balance = coinService.getBalance(memberId);
        return ResponseEntity.ok(new CoinBalanceResponse(balance));
    }

    @PostMapping("/add")
    public ResponseEntity<?> addCoins(@RequestBody CoinAddRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (request == null || request.amount() == null) {
            return ResponseEntity.badRequest().body("적립할 코인 수량을 입력해 주세요.");
        }
        try {
            long balance = coinService.addCoins(memberId, request.amount());
            return ResponseEntity.ok(new CoinBalanceResponse(balance));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> purchaseWithCoins(@RequestBody CoinPurchaseRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (request == null || request.price() == null) {
            return ResponseEntity.badRequest().body("차감할 코인 가격을 입력해 주세요.");
        }
        try {
            long balance = coinService.spendCoins(memberId, request.price());
            return ResponseEntity.ok(new CoinBalanceResponse(balance));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
