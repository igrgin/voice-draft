package com.igrgin.speachapp.dictation;

import com.igrgin.speachapp.cleanup.CleanupResult;
import com.igrgin.speachapp.cleanup.TranscriptCleaner;
import com.igrgin.speachapp.transcription.TranscriptTranscriber;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DictationService {
  private final TranscriptTranscriber transcriber;
  private final TranscriptCleaner cleaner;

  public DictationService(TranscriptTranscriber transcriber, TranscriptCleaner cleaner) {
    this.transcriber = transcriber;
    this.cleaner = cleaner;
  }

  public CleanupResult createCleanupResult(DictationRequest request, boolean cleanupEnabled) {
    String rawTranscript = transcriber.transcribe(request);
    return cleanupEnabled
        ? cleanTranscript(rawTranscript)
        : new CleanupResult(rawTranscript, rawTranscript, List.of());
  }

  public CleanupResult cleanTranscript(String rawTranscript) {
    return cleaner.clean(rawTranscript);
  }
}
