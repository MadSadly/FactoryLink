package com.factorylink.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

  /** AI 임베딩 배치 시 응답 지연 대비 */
  @Bean
  public RestTemplate restTemplate() {
    SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
    f.setConnectTimeout(10_000);
    f.setReadTimeout(120_000);
    return new RestTemplate(f);
  }
}
