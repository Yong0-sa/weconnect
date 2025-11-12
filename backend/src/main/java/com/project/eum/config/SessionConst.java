package com.project.eum.config;

/**
 * HttpSession 에 로그인 사용자를 저장할 때 재사용하는 키 값을 한 곳에 모아둔다.
 */
public final class SessionConst {
    // 외부에서 인스턴스 생성 불가 (정적 유틸리티 클래스 형태)
    private SessionConst() {}

    // 세션에 사용자 ID를 저장하거나 꺼낼 때 사용하는 키 이름
    public static final String LOGIN_MEMBER_ID = "LOGIN_MEMBER_ID";
    // 세션에 사용자 권한(예: USER, ADMIN 등)을 저장할 때 사용하는 키 이름
    public static final String LOGIN_MEMBER_ROLE = "LOGIN_MEMBER_ROLE";
}
