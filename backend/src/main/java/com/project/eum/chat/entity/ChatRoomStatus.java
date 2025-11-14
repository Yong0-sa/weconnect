package com.project.eum.chat.entity;

/**
 * 채팅방 상태. ACTIVE 상태에서만 메시지 송수신을 허용하고,
 * CLOSED 가 되면 읽기만 가능하도록 확장할 때 사용한다.
 */
public enum ChatRoomStatus {
    ACTIVE,
    CLOSED
}
