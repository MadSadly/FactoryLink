package com.factorylink.advice;

import com.factorylink.dto.ApiResponse;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException ex) {
    HttpStatus status;
    try {
      status = HttpStatus.valueOf(ex.getStatusCode().value());
    } catch (Exception ignored) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }
    String message =
        ex.getReason() != null ? ex.getReason() : "요청을 처리할 수 없습니다.";
    return ResponseEntity.status(status).body(ApiResponse.fail(message));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining(", "));
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.fail(message.isBlank() ? "입력값이 올바르지 않습니다." : message));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
    log.error("Unhandled error", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.fail("서버 오류가 발생했습니다."));
  }
}
