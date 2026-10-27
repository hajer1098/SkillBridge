package com.skillbridge;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;
@Configuration
class SecurityConfig {
 record Member(long id,String role){}
 static String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder(12);}
 @Bean SecurityFilterChain security(HttpSecurity http,JdbcTemplate db,@Value("${skillbridge.cors-origins}") String origins)throws Exception{
  var cors=new CorsConfiguration();cors.setAllowedOrigins(Arrays.asList(origins.split(",")));cors.setAllowedMethods(List.of("GET","POST","PATCH","PUT","OPTIONS"));cors.setAllowedHeaders(List.of("Content-Type","Authorization"));cors.setMaxAge(3600L);var source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",cors);
  http.cors(c->c.configurationSource(source)).csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(a->a.requestMatchers("/api/auth/**","/api/catalog/**","/api/health","/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").requestMatchers("/api/mentor/**").authenticated().anyRequest().authenticated())
   .exceptionHandling(e->e.authenticationEntryPoint((q,r,x)->{r.setStatus(401);r.setContentType("application/json");r.getWriter().write("{\"message\":\"Please sign in to continue.\"}");}).accessDeniedHandler((q,r,x)->{r.setStatus(403);r.setContentType("application/json");r.getWriter().write("{\"message\":\"Administrator permission required.\"}");}))
   .addFilterBefore(new OncePerRequestFilter(){protected void doFilterInternal(HttpServletRequest q,HttpServletResponse r,FilterChain chain)throws ServletException,IOException{String auth=q.getHeader("Authorization");if(auth!=null&&auth.startsWith("Bearer ")&&auth.length()<300){var users=db.query("SELECT u.id,u.role FROM auth_token t JOIN app_user u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>now() AND u.enabled AND u.verified",(rs,n)->new Member(rs.getLong(1),rs.getString(2)),hash(auth.substring(7)));if(!users.isEmpty()){var u=users.get(0);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(u,null,List.of(new SimpleGrantedAuthority("ROLE_"+u.role()))));}}chain.doFilter(q,r);}},UsernamePasswordAuthenticationFilter.class);
  return http.build();
 }
 static Member member(org.springframework.security.core.Authentication auth){return (Member)auth.getPrincipal();}
}
