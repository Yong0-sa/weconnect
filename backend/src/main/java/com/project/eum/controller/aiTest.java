package com.project.eum.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class aiTest {

    @GetMapping("/test")
    public String test() {
        return "AI Server Connection Test";
    }
}