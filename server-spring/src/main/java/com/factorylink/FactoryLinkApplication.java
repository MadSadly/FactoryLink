package com.factorylink;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

@SpringBootApplication
@MapperScan("com.factorylink.mapper")
public class FactoryLinkApplication {

  public static void main(String[] args) {
    SpringApplication app = new SpringApplication(FactoryLinkApplication.class);
    app.addListeners(
        (ApplicationListener<ApplicationEnvironmentPreparedEvent>)
            event -> validateRequiredConfiguration(event.getEnvironment()));
    app.run(args);
  }

  private static void validateRequiredConfiguration(ConfigurableEnvironment env) {
    for (String profile : env.getActiveProfiles()) {
      if ("test".equalsIgnoreCase(profile)) {
        return;
      }
    }
    if (!StringUtils.hasText(env.getProperty("spring.datasource.username"))) {
      throw new IllegalStateException(
          "DB_USER must be set (spring.datasource.username is empty). See devops/.env.example.");
    }
    if (!StringUtils.hasText(env.getProperty("spring.datasource.password"))) {
      throw new IllegalStateException(
          "DB_PASS must be set (spring.datasource.password is empty). See devops/.env.example.");
    }
    if (!StringUtils.hasText(env.getProperty("app.jwt.secret"))) {
      throw new IllegalStateException(
          "JWT_SECRET must be set (app.jwt.secret is empty). See devops/.env.example.");
    }
  }
}
