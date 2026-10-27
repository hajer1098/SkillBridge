package com.skillbridge;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/auth")
class AuthController {
 final JdbcTemplate db;final PasswordEncoder encoder;final WorkspaceService work;final JavaMailSender mail;final boolean demo,mailEnabled;final String from;
 AuthController(JdbcTemplate d,PasswordEncoder e,WorkspaceService w,JavaMailSender m,@Value("${skillbridge.demo-seed}")boolean demo,@Value("${skillbridge.mail-enabled}")boolean mailEnabled,@Value("${skillbridge.mail-from}")String from){db=d;encoder=e;work=w;mail=m;this.demo=demo;this.mailEnabled=mailEnabled;this.from=from;}
 record Register(@NotBlank @Size(min=2,max=80)String name,@NotBlank @Email @Size(max=254)String email,@NotBlank @Size(min=8,max=128)String password){}
 record Login(@NotBlank @Email String email,@NotBlank @Size(max=128)String password,String role){}
 record EmailRequest(@NotBlank @Email String email){}
 record Verify(@NotBlank String token){}
 record Reset(@NotBlank String token,@NotBlank @Size(min=8,max=128)String password){}
 final ConcurrentHashMap<String,long[]> attempts=new ConcurrentHashMap<>();
 void limit(String key){long now=System.currentTimeMillis();if(attempts.size()>10000)attempts.entrySet().removeIf(e->now-e.getValue()[0]>60000);var a=attempts.compute(key,(k,v)->v==null||now-v[0]>60000?new long[]{now,1}:new long[]{v[0],v[1]+1});if(a[1]>20)throw ApiException.error(429,"A little pause. Try again in a minute.");}
 @PostMapping("/register") @Transactional Map<String,Object> register(@Valid @RequestBody Register r,HttpServletRequest request){limit(request.getRemoteAddr());String email=r.email().trim().toLowerCase();if(!demo&&!mailEnabled)throw ApiException.error(503,"Email verification is not configured. Please contact the platform administrator.");if(db.queryForObject("SELECT count(*) FROM app_user WHERE email=?",Long.class,email)>0)throw ApiException.error(409,"An account with this email already exists.");Long id=db.queryForObject("INSERT INTO app_user(name,email,password_hash) VALUES(?,?,?) RETURNING id",Long.class,r.name().trim(),email,encoder.encode(r.password()));work.create(id,r.name().trim(),email);String raw=issue(id,"verify");deliver(email,"Your SkillBridge verification token",raw);var out=new HashMap<String,Object>();out.put("message","Account created. Verify your email before signing in.");if(demo&&!mailEnabled)out.put("developmentVerificationToken",raw);return out;}
 @PostMapping("/login") Map<String,Object> login(@Valid @RequestBody Login r,HttpServletRequest request){limit(request.getRemoteAddr()+r.email().toLowerCase());var rows=db.queryForList("SELECT * FROM app_user WHERE email=?",r.email().trim().toLowerCase());String dummy="$2a$12$1LQZ1ZhYK2E3wqF1q1q1qe7xoxKp4g20Yg9jiYud4uKJNHhQPZ4Vq";var u=rows.isEmpty()?Map.<String,Object>of():rows.get(0);if(!encoder.matches(r.password(),(String)u.getOrDefault("password_hash",dummy))||!Boolean.TRUE.equals(u.get("enabled")))throw ApiException.error(401,"Email or password is incorrect.");if(!Boolean.TRUE.equals(u.get("verified")))throw ApiException.error(403,"Please verify your email first.");if(r.role()!=null&&!r.role().equals(u.get("role")))throw ApiException.error(403,"This account belongs to the "+u.get("role").toString().toLowerCase()+" workspace. Choose the matching login.");String raw=UUID.randomUUID()+"."+UUID.randomUUID();db.update("INSERT INTO auth_token VALUES(?,?,now()+interval '12 hours')",SecurityConfig.hash(raw),u.get("id"));return Map.of("token",raw,"role",u.get("role"),"expiresIn",43200);}
 String issue(Long id,String kind){String raw=UUID.randomUUID()+"."+UUID.randomUUID();db.update("DELETE FROM one_time_token WHERE user_id=? AND kind=?",id,kind);db.update("INSERT INTO one_time_token VALUES(?,?,?,now()+interval '1 hour')",SecurityConfig.hash(raw),id,kind);return raw;}
 void deliver(String email,String subject,String token){if(mailEnabled){var msg=new SimpleMailMessage();msg.setFrom(from);msg.setTo(email);msg.setSubject(subject);msg.setText("Your one-time token is:\n"+token+"\n\nIt expires in one hour. If you did not request this, ignore this message.");mail.send(msg);}}
 @PostMapping("/verify") @Transactional Map<String,String> verify(@Valid @RequestBody Verify r){Long id=consume(r.token(),"verify");db.update("UPDATE app_user SET verified=true WHERE id=?",id);return Map.of("message","Your email is verified. You can now sign in.");}
 Long consume(String token,String kind){var ids=db.queryForList("DELETE FROM one_time_token WHERE token_hash=? AND kind=? AND expires_at>now() RETURNING user_id",Long.class,SecurityConfig.hash(token),kind);if(ids.isEmpty())throw ApiException.error(400,"This token is invalid or expired.");return ids.get(0);}
 @PostMapping("/forgot") @Transactional Map<String,String> forgot(@Valid @RequestBody EmailRequest r,HttpServletRequest request){limit(request.getRemoteAddr());var ids=db.queryForList("SELECT id FROM app_user WHERE email=?",Long.class,r.email().trim().toLowerCase());if(!ids.isEmpty()){String token=issue(ids.get(0),"reset");deliver(r.email(),"Reset your SkillBridge password",token);}return Map.of("message",mailEnabled?"If that account exists, a reset email is on its way.":"Email delivery is not configured. Contact the platform administrator.");}
 @PostMapping("/reset") @Transactional Map<String,String> reset(@Valid @RequestBody Reset r){Long id=consume(r.token(),"reset");db.update("UPDATE app_user SET password_hash=? WHERE id=?",encoder.encode(r.password()),id);db.update("DELETE FROM auth_token WHERE user_id=?",id);return Map.of("message","Password reset. Please sign in with your new password.");}
 @GetMapping("/session") Map<String,Object> session(Authentication a){if(a==null||!(a.getPrincipal() instanceof SecurityConfig.Member))throw ApiException.error(401,"Please sign in to continue.");var member=SecurityConfig.member(a);return Map.of("id",member.id(),"role",member.role());}
 @PostMapping("/logout") Map<String,String> logout(@RequestHeader("Authorization")String header){db.update("DELETE FROM auth_token WHERE token_hash=?",SecurityConfig.hash(header.substring(7)));return Map.of("message","Signed out.");}
}
