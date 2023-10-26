package com.biblioteka.Library.Repository;

import com.biblioteka.Library.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Repository
@Transactional(readOnly = true)
public interface UserRepository extends JpaRepository <User, UUID>{
    Optional<User> findByUsername(String username);
    @Transactional
    @Modifying
    @Query("UPDATE User a " + "SET a.enabled = TRUE where a.username = ?1")
    void enableUser(String username);
}
