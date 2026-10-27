package com.skillbridge;
import java.time.*;
import java.util.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component @ConditionalOnProperty(name="skillbridge.demo-seed",havingValue="true")
class DevelopmentSeed implements CommandLineRunner {
 final WorkspaceService w;final PasswordEncoder pw;DevelopmentSeed(WorkspaceService w,PasswordEncoder pw){this.w=w;this.pw=pw;}
 @Override @Transactional public void run(String...args)throws Exception {var db=w.db();var seed=w.json().readTree(new ClassPathResource("development-seed.json").getInputStream());String[][] accounts={{"Jamie Taylor","learner@skillbridge.local","LEARNER"},{"Sophie Chen","mentor@skillbridge.local","MENTOR"},{"Platform Admin","admin@skillbridge.local","ADMIN"}};for(var a:accounts){if(db.queryForObject("SELECT count(*) FROM app_user WHERE email=?",Long.class,a[1])==0){Long id=db.queryForObject("INSERT INTO app_user(name,email,password_hash,role,verified) VALUES(?,?,?,?,true) RETURNING id",Long.class,a[0],a[1],pw.encode("SkillBridge!2026"),a[2]);w.create(id,a[0],a[1]);if(a[2].equals("LEARNER")){var initial=seed.path("initialState").deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)initial).put("email",a[1]);((com.fasterxml.jackson.databind.node.ObjectNode)initial).putObject("lessonDates");db.update("UPDATE workspace SET data=?::jsonb WHERE user_id=?",w.encode(initial),id);}}}
  for(String kind:List.of("Course","Project")){for(var item:seed.path(kind.equals("Course")?"courses":"projects")){String id=item.path("id").asText();if(db.queryForObject("SELECT count(*) FROM content WHERE kind=? AND data->>'id'=?",Long.class,kind,id)==0)db.update("INSERT INTO content(kind,title,description,data,status) VALUES(?,?,?,?::jsonb,'Published')",kind,item.path("title").asText(),"Development sample content",w.encode(item));}}
  for(var m:seed.path("mentors")){long id=m.path("id").asLong();Long user=id==1?db.queryForObject("SELECT id FROM app_user WHERE email='mentor@skillbridge.local'",Long.class):null;db.update("INSERT INTO mentor_profile(id,user_id,name,expertise,bio,price,language,approved,development_seed) VALUES(?,?,?,?,?,?,?,true,true) ON CONFLICT(id) DO NOTHING",id,user,m.path("name").asText(),m.path("skills").toString(),m.path("bio").asText(),m.path("price").asDouble(),m.path("language").asText());if(m.path("available").asBoolean())for(int d=1;d<=7;d++)for(int hour=8;hour<=18;hour++){Instant at=LocalDate.now(ZoneOffset.UTC).plusDays(d).atTime(hour,0).toInstant(ZoneOffset.UTC);db.update("INSERT INTO mentor_slot VALUES(?,?) ON CONFLICT DO NOTHING",id,java.sql.Timestamp.from(at));}}
  db.execute("SELECT setval(pg_get_serial_sequence('mentor_profile','id'),(SELECT greatest(4,coalesce(max(id),0)) FROM mentor_profile))");
  if(db.queryForObject("SELECT count(*) FROM report",Long.class)==0)db.update("INSERT INTO report(kind,description) VALUES('Project','Development sample: missing image attribution')");
 }
}
