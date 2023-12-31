package com.biblioteka.Library.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class UserDto {
    private String name;
    private String surname;
    private String username;
    private String phoneNumber;
}
