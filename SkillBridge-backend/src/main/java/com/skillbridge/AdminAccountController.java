package com.skillbridge;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
class AdminAccountController {
 private final WorkspaceService work;
 private final PasswordEncoder passwords;

 AdminAccountController(WorkspaceService work, PasswordEncoder passwords) {
  this.work=work;
  this.passwords=passwords;
 }

 record CreateAccount(
   @NotBlank @Size(min=2,max=80) String name,
   @NotBlank @Email @Size(max=254) String email,
   @NotBlank @Size(min=12,max=72) String password,
   @NotBlank @Pattern(regexp="LEARNER|MENTOR|ADMIN") String role) {
  CreateAccount {
   name=name==null?null:name.trim();
   email=email==null?null:email.trim().toLowerCase(Locale.ROOT);
  }
 }

 @PostMapping
 @ResponseStatus(HttpStatus.CREATED)
 @Transactional
 Map<String,Object> create(Authentication authentication, @Valid @RequestBody CreateAccount account) {
  if(account.password().getBytes(StandardCharsets.UTF_8).length>72)
   throw ApiException.error(400,"The password must contain at most 72 UTF-8 bytes.");
  var actor=SecurityConfig.member(authentication);
  var db=work.db();
  if(db.queryForObject("SELECT count(*) FROM app_user WHERE email=?",Long.class,account.email())>0)
   throw ApiException.error(409,"An account with this email already exists.");
  Long id=db.queryForObject(
    "INSERT INTO app_user(name,email,password_hash,role,verified) VALUES(?,?,?,?,true) RETURNING id",
    Long.class,account.name(),account.email(),passwords.encode(account.password()),account.role());
  work.create(id,account.name(),account.email());
  if(account.role().equals("MENTOR"))
   db.update("INSERT INTO mentor_profile(user_id,name,expertise,bio,price,approved) VALUES(?,?,'','',0,false)",id,account.name());
  // Administrator-provisioned accounts can sign in without the public email flow.
  // Store only account metadata in the audit log, never the password or its hash.
  work.audit(actor.id(),"user.create",String.valueOf(id),Map.of("name",account.name(),"email",account.email(),"role",account.role()));
  return Map.of("id",id,"name",account.name(),"email",account.email(),"role",account.role(),"enabled",true,"verified",true);
 }
}
