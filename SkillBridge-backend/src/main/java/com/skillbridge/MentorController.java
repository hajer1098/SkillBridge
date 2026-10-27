package com.skillbridge;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/mentor")
class MentorController {
 final WorkspaceService w;MentorController(WorkspaceService w){this.w=w;}
 @PostMapping("/feedback") @Transactional Object feedback(Authentication a,@RequestBody JsonNode b){var u=SecurityConfig.member(a);if(!u.role().equals("MENTOR"))throw ApiException.error(403,"Mentor permission is required.");long learner=b.path("learnerId").asLong();int project=b.path("projectId").asInt();String text=WorkspaceService.text(b,"feedback",20,2000);Long count=w.db().queryForObject("SELECT count(*) FROM booking b JOIN mentor_profile m ON m.id=b.mentor_id WHERE m.user_id=? AND b.learner_id=? AND b.status='confirmed'",Long.class,u.id(),learner);if(count==0)throw ApiException.error(403,"You can review work only for your booked learners.");boolean exists=false;for(var p:w.raw(learner,false).path("portfolio"))if(p.path("id").asInt()==project)exists=true;if(!exists)throw ApiException.error(404,"Learner project not found.");w.db().update("INSERT INTO project_feedback(learner_id,mentor_id,project_id,body) VALUES(?,?,?,?)",learner,u.id(),project,text);w.note(learner,"Mentor feedback on your project: "+text);w.audit(u.id(),"project.feedback",learner+":"+project,Map.of());return w.state(u);}
 @GetMapping("/learners") Object learners(Authentication a){var u=SecurityConfig.member(a);if(!u.role().equals("MENTOR"))throw ApiException.error(403,"Mentor permission required.");return w.db().queryForList("SELECT DISTINCT u.id,u.name,w.data->'portfolio' AS portfolio FROM booking b JOIN mentor_profile m ON m.id=b.mentor_id JOIN app_user u ON u.id=b.learner_id JOIN workspace w ON w.user_id=u.id WHERE m.user_id=? AND b.status='confirmed'",u.id());}
}
