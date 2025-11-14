package com.project.eum.chat.repository;

import com.project.eum.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByFarmFarmIdAndFarmerUserIdAndUserUserId(Long farmId, Long farmerId, Long userId);

    List<ChatRoom> findByFarmerUserIdOrUserUserIdOrderByUpdatedAtDesc(Long farmerId, Long userId);
}
