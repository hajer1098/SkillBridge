package com.skillbridge;

import com.fasterxml.jackson.databind.JsonNode;
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
 final WorkspaceService w; final PasswordEncoder pw;
 DevelopmentSeed(WorkspaceService w,PasswordEncoder pw){this.w=w;this.pw=pw;}
 long account(String name,String email,String role){
  var db=w.db();var existing=db.queryForList("SELECT id FROM app_user WHERE email=?",Long.class,email);
  if(!existing.isEmpty())return existing.get(0);
  Long id=db.queryForObject("INSERT INTO app_user(name,email,password_hash,role,verified) VALUES(?,?,?,?,true) RETURNING id",Long.class,name,email,pw.encode("SkillBridge!2026"),role);
  w.create(id,name,email);return id;
 }
 void taxonomy(String kind,String title){
  var db=w.db();if(db.queryForObject("SELECT count(*) FROM content WHERE kind=? AND title=?",Long.class,kind,title)==0)
   db.update("INSERT INTO content(kind,title,description,data,status) VALUES(?,?,?,?::jsonb,'Published')",kind,title,"Development sample "+kind.toLowerCase(),w.encode(Map.of("title",title)));
 }
 @Override @Transactional public void run(String...args)throws Exception {
  var db=w.db();JsonNode seed;
  if(db.queryForObject("SELECT count(*) FROM app_seed WHERE seed_key='catalog-v2'",Long.class)>0)return;
  try(var input=new ClassPathResource("development-seed.json").getInputStream()){seed=w.json().readTree(input);}
  // Existing account credentials and user-owned workspaces are never reset.
  account("Jamie Taylor","learner@skillbridge.local","LEARNER");
  account("Platform Admin","admin@skillbridge.local","ADMIN");
  for(String kind:List.of("Course","Project"))for(var item:seed.path(kind.equals("Course")?"courses":"projects")){
   if(db.queryForObject("SELECT count(*) FROM content WHERE kind=? AND data->>'id'=?",Long.class,kind,item.path("id").asText())==0)
    db.update("INSERT INTO content(kind,title,description,data,status) VALUES(?,?,?,?::jsonb,'Published')",kind,item.path("title").asText(),"Development sample content",w.encode(item));
   taxonomy("Category",item.path("category").asText());for(var skill:item.path("skills"))taxonomy("Skill",skill.asText());
  }
  for(var skill:seed.path("skillOptions"))taxonomy("Skill",skill.asText());
  for(var m:seed.path("mentors")){
   long id=m.path("id").asLong();long user=account(m.path("name").asText(),m.path("email").asText(),"MENTOR");
   int inserted=db.update("INSERT INTO mentor_profile(id,user_id,name,expertise,bio,price,language,approved,development_seed,profession,company,image,rating,reviews) VALUES(?,?,?,?,?,?,?,true,true,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",id,user,m.path("name").asText(),m.path("skills").toString(),m.path("bio").asText(),m.path("price").asDouble(),m.path("language").asText(),m.path("role").asText(),m.path("company").asText(),m.path("image").asText(),m.path("rating").asText(),m.path("reviews").asInt());
   // Backfill older seed metadata without overwriting administrative edits.
   db.update("UPDATE mentor_profile SET user_id=coalesce(user_id,?),profession=?,company=?,image=?,rating=?,reviews=? WHERE id=? AND development_seed AND profession=''",user,m.path("role").asText(),m.path("company").asText(),m.path("image").asText(),m.path("rating").asText(),m.path("reviews").asInt(),id);
   // Availability is seeded once, so removing times survives an API restart.
   if(inserted>0&&m.path("available").asBoolean())for(int d=1;d<=7;d++)for(int hour=8;hour<=18;hour++){
    Instant at=LocalDate.now(ZoneOffset.UTC).plusDays(d).atTime(hour,0).toInstant(ZoneOffset.UTC);
    db.update("INSERT INTO mentor_slot VALUES(?,?) ON CONFLICT DO NOTHING",id,java.sql.Timestamp.from(at));
   }
  }
  db.execute("SELECT setval(pg_get_serial_sequence('mentor_profile','id'),(SELECT greatest(4,coalesce(max(id),0)) FROM mentor_profile))");
  if(db.queryForObject("SELECT count(*) FROM report",Long.class)==0)db.update("INSERT INTO report(kind,description) VALUES('Project','Development sample: missing image attribution')");
  db.update("INSERT INTO app_seed(seed_key) VALUES('catalog-v2')");
 }
}
