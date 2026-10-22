# Issue #7 Prototype Notes

## Answer

MVP backend should expose one bounded upload command endpoint:

```http
POST /api/dictations
Content-Type: multipart/form-data
```

Request fields:

- `audio`: required browser-recorded audio blob, such as `audio/webm` or `audio/wav`
- `recordingMimeType`: optional explicit MIME type selected by `MediaRecorder`
- `durationSeconds`: optional client-reported duration used for policy feedback, not trust

Successful response:

```json
{
  "rawTranscript": "...",
  "cleanedText": "...",
  "uncertainties": [
    {
      "text": "...",
      "reason": "..."
    }
  ]
}
```

## Data Flow

1. React records bounded audio with `getUserMedia()` and `MediaRecorder`.
2. React uploads the blob to `POST /api/dictations` as multipart form data.
3. Spring controller validates request size, media type, and basic duration policy before provider calls.
4. `TranscriptTranscriber` application port calls Spring AI OpenAI transcription, defaulting to `gpt-4o-mini-transcribe`.
5. Cleanup service calls Spring AI `ChatClient` with a Conservative Cleanup prompt and structured output.
6. Paragraph Command handling belongs in Conservative Cleanup for MVP, not in a separate command language.
7. Backend returns a Cleanup Result containing Raw Transcript, Cleaned Text, and Cleanup Uncertainties.
8. Frontend owns result review/edit/accept locally until persistence, accounts, and history are specified.

## Error Shape

Return validation failures as `application/problem+json` with `400` status and a stable app code such as `unsupported_audio_type` or `audio_too_large`.

Return transcription or cleanup provider failures as retryable `application/problem+json` responses, typically `503`, with codes such as `transcription_provider_unavailable` and `cleanup_provider_unavailable`.

Cleanup Uncertainty is not an error. It stays inside a successful Cleanup Result so the UI can highlight it for review.

## Deferred

Do not add streaming endpoints for MVP. Later realtime work should be a separate API surface because it changes the browser contract, backend credential brokering, provider adapter, and partial transcript event model.

Do not add backend review persistence yet. The top-level map leaves persistence, history, authentication, and retention unspecified, so accepting or editing Cleaned Text should remain frontend state for this design slice.
