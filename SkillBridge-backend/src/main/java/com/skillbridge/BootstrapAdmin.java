package com.skillbridge;

import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the first production administrator without enabling development accounts. */
@Component @Order(10)
class BootstrapAdmin implements CommandLineRunner {
 private final WorkspaceService work;
 private final PasswordEncoder passwords;
 private final String email, password, name;

 BootstrapAdmin(WorkspaceService work, PasswordEncoder passwords,
   @Value("${skillbridge.bootstrap-admin-email:}") String email,
   @Value("${skillbridge.bootstrap-admin-password:}") String password,
   @Value("${skillbridge.bootstrap-admin-name:SkillBridge Admin}") String name) {
  this.work=work; this.passwords=passwords; this.email=email.trim().toLowerCase(Locale.ROOT);
  this.password=password; this.name=name.trim();
 }

 @Override @Transactional public void run(String... args) {
  if(email.isBlank() && password.isBlank()) return;
  if(email.length()>254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
   throw new IllegalStateException("Set a valid BOOTSTRAP_ADMIN_EMAIL or leave both bootstrap settings unset.");
  if(password.length()<12 || password.length()>128)
   throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must contain 12 to 128 characters.");
  if(name.length()<2 || name.length()>80)
   throw new IllegalStateException("BOOTSTRAP_ADMIN_NAME must contain 2 to 80 characters.");
  var db=work.db();
  var existing=db.queryForList("SELECT id,role,enabled,verified FROM app_user WHERE email=?",email);
  if(!existing.isEmpty()) {
   var account=existing.get(0);
   if(!"ADMIN".equals(account.get("role")) || !Boolean.TRUE.equals(account.get("enabled")) || !Boolean.TRUE.equals(account.get("verified")))
    throw new IllegalStateException("The bootstrap email already belongs to an account without active administrator access.");
   return; // Do not overwrite an existing administrator's password or workspace.
  }
  Long id=db.queryForObject("INSERT INTO app_user(name,email,password_hash,role,verified) VALUES(?,?,?,'ADMIN',true) RETURNING id",Long.class,name,email,passwords.encode(password));
  work.create(id,name,email);
  work.audit(id,"admin.bootstrap",String.valueOf(id),Map.of());
 }
}
