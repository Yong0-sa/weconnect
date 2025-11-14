package com.project.eum.chat.repository;

import com.project.eum.chat.entity.ChatContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatContentRepository extends JpaRepository<ChatContent, Long> {

    List<ChatContent> findTop50ByRoomRoomIdOrderByContentIdDesc(Long roomId);
}
