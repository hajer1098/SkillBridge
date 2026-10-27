package com.skillbridge;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice
class ApiException {
 @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> bad(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Request could not be completed":e.getReason(),"status",e.getStatusCode().value(),"timestamp",Instant.now().toString()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e){return ResponseEntity.badRequest().body(Map.of("message","Please check your form.","errors",e.getBindingResult().getFieldErrors().stream().map(f->Map.of("field",f.getField(),"message",String.valueOf(f.getDefaultMessage()))).toList()));}
 @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class}) ResponseEntity<?> invalid(Exception e){return ResponseEntity.badRequest().body(Map.of("message","Please check your values, links, and date format."));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(Exception e){return ResponseEntity.status(409).body(Map.of("message","That record already exists or the selected time is no longer available."));}
 @ExceptionHandler(AccessDeniedException.class) ResponseEntity<?> denied(Exception e){return ResponseEntity.status(403).body(Map.of("message","Your account does not have permission for this action."));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> other(Exception e){org.slf4j.LoggerFactory.getLogger(ApiException.class).error("API request failed",e);return ResponseEntity.status(500).body(Map.of("message","Something went wrong. Please try again.","timestamp",Instant.now().toString()));}
 static ResponseStatusException error(int status,String message){return new ResponseStatusException(HttpStatusCode.valueOf(status),message);}
}
