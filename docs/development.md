# Development guide

## API

The React app calls Spring Boot; the browser never receives an OpenAI key.
Both endpoints return a Cleanup Result containing `rawTranscript`, `cleanedText`
and `uncertainties`.

| Endpoint | Input | Behavior |
| --- | --- | --- |
| `POST /api/dictations` | Multipart `audio`, optional `recordingMimeType`, `durationSeconds`, `cleanupEnabled` | Transcribes audio and optionally cleans the transcript. Cleanup defaults to `true` for direct API clients. |
| `POST /api/cleanups` | JSON `{ "rawTranscript": "..." }` | Cleans existing text without uploading or transcribing audio. |

The UI sends `cleanupEnabled=false` when uploading audio, then calls
`/api/cleanups` if cleanup is enabled. With cleanup off, `cleanedText` equals
`rawTranscript` exactly and `uncertainties` is empty.

Audio limits are 25,000,000 bytes and 600 seconds. Accepted containers are
`audio/webm`, `audio/mp4`, `audio/ogg` and `audio/wav`. Cleanup accepts nonblank
transcripts of up to 100,000 characters. Validation and provider errors use
Problem Details with `code` and `retryable` fields.

## Workflow and retries

Progress follows actual requests: **Uploading and transcribing audio**, then
**Cleaning transcript**. The cleanup switch is disabled during recording and
processing.

After transcription succeeds, the browser keeps the original Raw Transcript.
Switching cleanup on submits that exact text; successful Cleaned Text is cached.
Further mode switches need no network requests. Edits are kept separately in each
mode and never become cleanup input.

**Retry processing** resubmits audio when transcription has not succeeded.
**Retry cleanup** sends the saved Raw Transcript without repeating transcription.
If cleanup fails, the original transcript is still available for review.
A new recording or page reload clears results and edits.

## Configuration

Shared defaults are in `backend/src/main/resources/application.yml`. With no
profile, the app uses fake providers and needs no key. The `dev` profile also
uses fake providers. The `prod` profile enables real OpenAI calls, even when
running locally; it does not mean the app has been deployed.

| Environment variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Required for real OpenAI calls | None |
| `OPENAI_TRANSCRIPTION_MODEL` | Speech-to-text model | `gpt-transcribe` |
| `OPENAI_CLEANUP_MODEL` | Text cleanup model | `gpt-6-luna` |

Transcription requests JSON responses. Cleanup uses provider structured output,
`reasoning_effort=none` and temperature zero. Model overrides must support those
options. The backend attaches the original Raw Transcript to the result; the
cleanup model returns only Cleaned Text and uncertainties.

Credentials belong in your environment. `.env` files and
`application-*.local.yml` files are ignored by Git; the app does not automatically
load a `.env` file.

## Tests

```bash
mvn -f backend/pom.xml test
npm --prefix frontend test
npm --prefix frontend run build
```

Backend tests cover upload validation, provider errors, transcript preservation,
cleanup validation and evaluation cases. Frontend tests cover recording, actual
request stages, retries, comparison caching, separate edits, copy/export and
phone layout. Routine tests use fake providers or mocked responses.

The frontend test command runs Vitest and Playwright and installs Playwright's
managed Chromium if needed. Set `PLAYWRIGHT_CHROME_CHANNEL=chrome` only to use
your installed Chrome instead.

For a live check, start the backend with `SPRING_PROFILES_ACTIVE=prod` and an
OpenAI key in the environment, then record a short sentence through the browser.
Try “new paragraph” and switch cleanup off/on to compare the same transcript.
This check calls OpenAI and is separate from the automated suite.

## Troubleshooting

Use the `prod` profile for real results; default/dev results are simulated.
Restart the backend after changing Java code or environment variables. The Vite
server proxies `/api` to `http://127.0.0.1:8080`.

Cleanup failures are logged at WARN level with validation or provider details.
The application does not explicitly log audio or Raw Transcript; avoid enabling
HTTP payload logging when using private recordings.

## Project notes

- [Domain vocabulary](../CONTEXT.md)
- [Original architecture research](research/)
- [Early workflow prototypes](../prototypes/README.md)

Research and prototypes record earlier decisions and may refer to older models
or workflow details. The application source and this guide describe current
behavior.
