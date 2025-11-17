package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.FarmContractApplyRequest;
import com.project.eum.dto.FarmContractResponse;
import com.project.eum.dto.FarmContractStatusUpdateRequest;
import com.project.eum.service.FarmContractService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/farm-contracts", "/farm-contracts"})
@RequiredArgsConstructor
public class FarmContractController {

    private final FarmContractService farmContractService;

    @PostMapping
    public ResponseEntity<?> applyForFarm(
            @Valid @RequestBody FarmContractApplyRequest request,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        try {
            FarmContractResponse response = farmContractService.apply(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    @GetMapping("/owner")
    public ResponseEntity<?> getContractsForOwner(HttpSession session) {
        Long ownerId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (ownerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        try {
            List<FarmContractResponse> responses = farmContractService.getContractsForOwner(ownerId);
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    @PatchMapping("/{contractId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long contractId,
            @Valid @RequestBody FarmContractStatusUpdateRequest request,
            HttpSession session
    ) {
        Long ownerId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (ownerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        try {
            FarmContractResponse response = farmContractService.updateStatus(ownerId, contractId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    @DeleteMapping("/{contractId}")
    public ResponseEntity<?> deleteContract(
            @PathVariable Long contractId,
            HttpSession session
    ) {
        Long ownerId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (ownerId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 후 이용해 주세요.");
        }

        try {
            farmContractService.deleteContract(ownerId, contractId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }
}
