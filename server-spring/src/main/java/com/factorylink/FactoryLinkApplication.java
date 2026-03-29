package com.factorylink;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.factorylink.mapper")
public class FactoryLinkApplication {
  public static void main(String[] args) {
    SpringApplication.run(FactoryLinkApplication.class, args);
  }
}
