package com.igrgin.speachapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class VoiceDraftApplication {

  public static void main(String[] args) {
    SpringApplication.run(VoiceDraftApplication.class, args);
  }
}
