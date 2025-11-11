package com.project.eum.config;

/**
 * HttpSession 에 로그인 사용자를 저장할 때 재사용하는 키 값을 한 곳에 모아둔다.
 */
public final class SessionConst {
    private SessionConst() {}

    public static final String LOGIN_MEMBER_ID = "LOGIN_MEMBER_ID";
    public static final String LOGIN_MEMBER_ROLE = "LOGIN_MEMBER_ROLE";
}
