package com.skillbridge;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
@SpringBootApplication(exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class) @EnableMethodSecurity
public class SkillBridgeApplication {
 public static void main(String[] args){SpringApplication.run(SkillBridgeApplication.class,args);}
}
