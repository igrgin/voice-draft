package com.igrgin.speachapp.dictation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.igrgin.speachapp.cleanup.CleanupResult;
import com.igrgin.speachapp.cleanup.TranscriptCleaner;
import com.igrgin.speachapp.transcription.TranscriptTranscriber;
import java.util.List;
import org.junit.jupiter.api.Test;

class DictationServiceTest {
  @Test
  void cleansTheExactSavedTranscriptWithoutTranscribingAgain() {
    TranscriptTranscriber transcriber = mock(TranscriptTranscriber.class);
    TranscriptCleaner cleaner = mock(TranscriptCleaner.class);
    String raw = " um hello\n";
    CleanupResult expected = new CleanupResult(raw, "Hello.", List.of());
    when(cleaner.clean(raw)).thenReturn(expected);

    assertThat(new DictationService(transcriber, cleaner).cleanTranscript(raw)).isSameAs(expected);
    verifyNoInteractions(transcriber);
  }

  @Test
  void skipsCleanerEntirelyAndPreservesExactTranscriptWhenCleanupIsOff() {
    TranscriptTranscriber transcriber = mock(TranscriptTranscriber.class);
    TranscriptCleaner cleaner = mock(TranscriptCleaner.class);
    DictationRequest request = new DictationRequest(new byte[] {1}, "audio/webm", "audio/webm", 1.0);
    String raw = "um I think so. New paragraph.\n";
    when(transcriber.transcribe(request)).thenReturn(raw);

    CleanupResult result = new DictationService(transcriber, cleaner).createCleanupResult(request, false);

    assertThat(result.rawTranscript()).isEqualTo(raw);
    assertThat(result.cleanedText()).isEqualTo(raw);
    assertThat(result.uncertainties()).isEmpty();
    verifyNoInteractions(cleaner);
  }

  @Test
  void passesTranscriptToCleanerWhenCleanupIsOn() {
    TranscriptTranscriber transcriber = mock(TranscriptTranscriber.class);
    TranscriptCleaner cleaner = mock(TranscriptCleaner.class);
    DictationRequest request = new DictationRequest(new byte[] {1}, "audio/webm", "audio/webm", 1.0);
    CleanupResult expected = new CleanupResult("um hello", "Hello.", List.of());
    when(transcriber.transcribe(request)).thenReturn("um hello");
    when(cleaner.clean("um hello")).thenReturn(expected);

    assertThat(new DictationService(transcriber, cleaner).createCleanupResult(request, true))
        .isSameAs(expected);
  }
}
