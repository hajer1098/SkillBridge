package com.skillbridge;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

class BootstrapAdminTest {
 private WorkspaceService work;
 private JdbcTemplate db;
 private PasswordEncoder passwords;
 @BeforeEach void setup(){work=mock(WorkspaceService.class);db=mock(JdbcTemplate.class);passwords=mock(PasswordEncoder.class);when(work.db()).thenReturn(db);}
 private BootstrapAdmin admin(String email,String password){return new BootstrapAdmin(work,passwords,email,password,"Platform Admin");}

 @Test void optionalConfigurationDoesNothing(){admin("","").run();verifyNoInteractions(db,passwords);}
 @Test void hashesPasswordAndCreatesIndependentWorkspace(){
  when(db.queryForList(anyString(),eq("owner@example.test"))).thenReturn(List.of());
  when(passwords.encode("A-long-password!2026")).thenReturn("bcrypt-hash");
  when(db.queryForObject(anyString(),eq(Long.class),eq("Platform Admin"),eq("owner@example.test"),eq("bcrypt-hash"))).thenReturn(42L);
  admin("OWNER@example.test","A-long-password!2026").run();
  verify(passwords).encode("A-long-password!2026");
  verify(work).create(42L,"Platform Admin","owner@example.test");
  verify(work).audit(eq(42L),eq("admin.bootstrap"),eq("42"),any());
 }
 @Test void restartDoesNotResetExistingAdministrator(){
  when(db.queryForList(anyString(),eq("owner@example.test"))).thenReturn(List.of(Map.of("id",42L,"role","ADMIN","enabled",true,"verified",true)));
  admin("owner@example.test","A-long-password!2026").run();
  verifyNoInteractions(passwords);verify(work,never()).create(anyLong(),anyString(),anyString());
 }
 @Test void refusesToPromoteExistingLearner(){
  when(db.queryForList(anyString(),eq("owner@example.test"))).thenReturn(List.of(Map.of("id",42L,"role","LEARNER","enabled",true,"verified",true)));
  assertThrows(IllegalStateException.class,()->admin("owner@example.test","A-long-password!2026").run());
  verifyNoInteractions(passwords);
 }
 @Test void rejectsIncompleteOrWeakConfiguration(){
  assertThrows(IllegalStateException.class,()->admin("owner@example.test","").run());
  assertThrows(IllegalStateException.class,()->admin("","A-long-password!2026").run());
  assertThrows(IllegalStateException.class,()->admin("owner@example.test","short").run());
  verifyNoInteractions(db,passwords);
 }
}
