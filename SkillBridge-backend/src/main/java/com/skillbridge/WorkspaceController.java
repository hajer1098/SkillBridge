package com.skillbridge;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
class WorkspaceController {
 final WorkspaceService w;WorkspaceController(WorkspaceService w){this.w=w;}
 @GetMapping("/health") Map<String,String> health(){return Map.of("status","up","paymentMode","internal_development_sandbox","recommendationDefault","rules-based");}
 @GetMapping("/workspace") Object state(Authentication a){return w.state(SecurityConfig.member(a));}
 @PostMapping("/workspace/profile") Object profile(Authentication a,@RequestBody JsonNode b){return w.profile(SecurityConfig.member(a),b);}
 @PostMapping("/workspace/saved") Object saved(Authentication a,@RequestBody JsonNode b){var u=SecurityConfig.member(a);var arr=b.path("saved");if(!arr.isArray()||arr.size()>100)throw ApiException.error(400,"Invalid saved courses.");arr.forEach(x->w.content("Course",x.asInt()));w.patch(u.id(),s->s.set("saved",arr));return w.state(u);}
 @PostMapping("/workspace/notifications") Object notifications(Authentication a){var u=SecurityConfig.member(a);w.patch(u.id(),s->s.withArray("notifications").forEach(n->((com.fasterxml.jackson.databind.node.ObjectNode)n).put("read",true)));return w.state(u);}
 @PostMapping("/workspace/goal") Object goal(Authentication a,@RequestBody JsonNode b){int n=b.path("weeklyGoal").asInt();if(n<1||n>30)throw ApiException.error(400,"Choose a weekly goal between 1 and 30.");var u=SecurityConfig.member(a);w.patch(u.id(),s->s.put("weeklyGoal",n));return w.state(u);}
 @PostMapping("/courses/{id}/enroll") Object enroll(Authentication a,@PathVariable int id){return w.enroll(SecurityConfig.member(a),id);}
 @PostMapping("/courses/{id}/lessons/{lesson}") Object lesson(Authentication a,@PathVariable int id,@PathVariable int lesson){return w.lesson(SecurityConfig.member(a),id,lesson);}
 @PostMapping("/projects/{id}/start") Object start(Authentication a,@PathVariable int id){return w.start(SecurityConfig.member(a),id);}
 @PostMapping("/portfolio") Object portfolio(Authentication a,@RequestBody JsonNode b){return w.portfolio(SecurityConfig.member(a),b);}
 @PostMapping("/bookings") Object book(Authentication a,@RequestBody JsonNode b){return w.book(SecurityConfig.member(a),b);}
 @PostMapping("/bookings/{id}/cancel") Object cancel(Authentication a,@PathVariable UUID id){return w.cancel(SecurityConfig.member(a),id);}
 @PostMapping("/messages") Object message(Authentication a,@RequestBody JsonNode b){return w.message(SecurityConfig.member(a),b);}
 @PostMapping("/mentor/application") Object apply(Authentication a,@RequestBody JsonNode b){return w.apply(SecurityConfig.member(a),b);}
 @PostMapping("/mentor/availability") Object availability(Authentication a,@RequestBody JsonNode b){return w.availability(SecurityConfig.member(a),b);}
}
