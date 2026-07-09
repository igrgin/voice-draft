package com.igrgin.speachapp.cleanup;

import com.igrgin.speachapp.config.AiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
    prefix = "app.ai",
    name = "provider-mode",
    havingValue = AiProperties.SPRING_AI_OPENAI_PROVIDER_MODE
)
public class ConservativeCleanupService implements TranscriptCleaner {
  private static final int MAX_ATTEMPTS = 2;
  private static final Logger LOGGER = LoggerFactory.getLogger(ConservativeCleanupService.class);

  private final CleanupModelClient cleanupModelClient;

  public ConservativeCleanupService(CleanupModelClient cleanupModelClient) {
    this.cleanupModelClient = cleanupModelClient;
  }

  @Override
  public CleanupResult clean(String rawTranscript) {
    RuntimeException lastFailure = null;

    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        CleanupModelResult result = cleanupModelClient.clean(rawTranscript);
        if (result == null) {
          throw new CleanupModelResult.MalformedCleanupModelResultException(
              "Cleanup provider returned no Cleanup Result."
          );
        }
        return result.toCleanupResult(rawTranscript);
      } catch (RuntimeException exception) {
        lastFailure = exception;
        LOGGER.warn(
            "Cleanup attempt {}/{} failed with {}: {}",
            attempt,
            MAX_ATTEMPTS,
            exception.getClass().getSimpleName(),
            exception.getMessage(),
            exception
        );
      }
    }

    throw new CleanupProviderUnavailableException(
        lastFailure instanceof CleanupModelResult.MalformedCleanupModelResultException
            ? "Cleanup provider returned malformed Cleanup Result."
            : "Cleanup provider is temporarily unavailable.",
        lastFailure
    );
  }
}
