package com.biblioteka.Library.Security.config;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum Permissions {
    ADMIN_READ("admin:read"),
    ADMIN_CREATE("admin:create"),
    ADMIN_UPDATE("admin:update"),
    ADMIN_DELETE("admin:delete"),
    EMPLOYEE_READ("employee:read"),
    EMPLOYEE_UPDATE("employee:update"),
    EMPLOYEE_CREATE("employee:create"),
    EMPLOYEE_DELETE("employee:delete"),
    USER_READ("user:read"),
    USER_UPDATE("user:update")
    ;

    @Getter
    private final String permission;
}
