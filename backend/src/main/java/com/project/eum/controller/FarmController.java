package com.project.eum.controller;

import com.project.eum.config.SessionConst;
import com.project.eum.dto.CreateFarmRequest;
import com.project.eum.dto.FarmResponse;
import com.project.eum.farm.Farm;
import com.project.eum.service.FarmService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/farms", "/farms"})
@RequiredArgsConstructor
public class FarmController {

    private final FarmService farmService;

    @PostMapping
    public ResponseEntity<?> registerFarm(@Valid @RequestBody CreateFarmRequest request, HttpSession session) {
        Long memberId = (Long) session.getAttribute(SessionConst.LOGIN_MEMBER_ID);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인 후 이용해 주세요.");
        }
        try {
            Farm farm = farmService.registerFarm(memberId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(FarmResponse.from(farm));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }
}
