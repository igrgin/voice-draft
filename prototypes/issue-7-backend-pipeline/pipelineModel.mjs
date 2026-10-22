const INITIAL_TRANSCRIPT =
  "um this is a quick note about open ai and spring boot new paragraph i think the upload flow should stay simple";

const CLEANED_WITH_PARAGRAPH =
  "This is a quick note about OpenAI and Spring Boot.\n\nI think the upload flow should stay simple.";

const CLEANED_WITH_UNCERTAINTY =
  "This is a quick note about OpenAI and Spring Boot.\n\nI think the upload flow should stay simple.";

export function initialState() {
  return {
    api: {
      endpoint: "POST /api/dictations",
      mode: "bounded multipart upload",
      responseShape: "Cleanup Result",
      reviewOwner: "frontend local review until persistence is specified",
      streaming: "deferred: only add realtime endpoints when live partial transcripts are required",
    },
    request: null,
    pipeline: {
      phase: "idle",
      legalNext: ["uploadValid", "uploadUnsupportedType", "uploadTooLarge"],
      steps: [],
    },
    response: null,
    review: {
      state: "not-started",
      acceptedCleanedText: null,
      userEditedText: null,
    },
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "reset":
      return initialState();
    case "uploadValid":
      return startRequest({
        fileName: "meeting-note.webm",
        contentType: "audio/webm",
        sizeBytes: 1_940_000,
        durationSeconds: 47,
      });
    case "uploadUnsupportedType":
      return validationError({
        fileName: "notes.txt",
        contentType: "text/plain",
        sizeBytes: 12_400,
        durationSeconds: 0,
        code: "unsupported_audio_type",
        detail: "Only browser-recorded audio containers such as audio/webm or audio/wav are accepted.",
      });
    case "uploadTooLarge":
      return validationError({
        fileName: "long-session.webm",
        contentType: "audio/webm",
        sizeBytes: 31_000_000,
        durationSeconds: 920,
        code: "audio_too_large",
        detail: "The uploaded audio exceeds the MVP request limit. The frontend should ask for a shorter recording.",
      });
    case "validate":
      return transitionFrom(state, ["received"], () => ({
        pipeline: advance(state.pipeline, "validated", "upload validated"),
        response: inFlightResponse(202, "Audio accepted for transcription inside the request pipeline."),
      }));
    case "transcribe":
      return transitionFrom(state, ["validated"], () => ({
        pipeline: advance(state.pipeline, "transcribed", "Raw Transcript produced by TranscriptTranscriber port"),
        response: inFlightResponse(202, "Raw Transcript available; cleanup can run."),
        request: {
          ...state.request,
          rawTranscript: INITIAL_TRANSCRIPT,
          transcription: {
            provider: "OpenAI via Spring AI",
            model: "gpt-4o-mini-transcribe",
            port: "TranscriptTranscriber",
          },
        },
      }));
    case "transcriptionError":
      return transitionFrom(state, ["validated"], () => providerError(state, {
        phase: "transcription-failed",
        code: "transcription_provider_unavailable",
        detail: "The transcription provider failed or timed out. The frontend can retry the same audio upload.",
        step: "transcription failed",
      }));
    case "cleanup":
      return transitionFrom(state, ["transcribed"], () => cleanupSuccess(state, {
        cleanedText: "This is a quick note about OpenAI and Spring Boot. I think the upload flow should stay simple.",
        uncertainties: [],
        step: "Conservative Cleanup produced Cleaned Text",
      }));
    case "paragraphCleanup":
      return transitionFrom(state, ["transcribed"], () => cleanupSuccess(state, {
        cleanedText: CLEANED_WITH_PARAGRAPH,
        uncertainties: [],
        step: "Paragraph Command converted to a paragraph break",
      }));
    case "uncertainCleanup":
      return transitionFrom(state, ["transcribed"], () => cleanupSuccess(state, {
        cleanedText: CLEANED_WITH_UNCERTAINTY,
        uncertainties: [
          {
            text: "I think",
            reason: "Could be Hedging Language or a Disfluency Filler; preserve and surface for review.",
          },
        ],
        step: "Cleanup Uncertainty surfaced for review",
      }));
    case "cleanupError":
      return transitionFrom(state, ["transcribed"], () => providerError(state, {
        phase: "cleanup-failed",
        code: "cleanup_provider_unavailable",
        detail: "The cleanup model failed after transcription succeeded. Return a retryable error and keep Raw Transcript available only within this request unless persistence is later specified.",
        step: "cleanup failed",
      }));
    case "accept":
      return transitionFrom(state, ["ready-for-review"], () => ({
        pipeline: advance(state.pipeline, "accepted", "user accepted Cleaned Text in frontend review"),
        review: {
          state: "accepted",
          acceptedCleanedText: state.response?.body?.cleanedText ?? null,
          userEditedText: null,
        },
      }));
    case "edit":
      return transitionFrom(state, ["ready-for-review"], () => ({
        pipeline: advance(state.pipeline, "edited", "user edited Cleaned Text in frontend review"),
        review: {
          state: "edited",
          acceptedCleanedText: null,
          userEditedText: appendEditMarker(state.response?.body?.cleanedText),
        },
      }));
    default:
      return state;
  }
}

function startRequest(file) {
  const state = initialState();

  return {
    ...state,
    request: {
      id: "prototype-request-1",
      file,
      rawTranscript: null,
      transcription: null,
    },
    pipeline: {
      phase: "received",
      legalNext: ["validate"],
      steps: ["multipart audio received"],
    },
    response: inFlightResponse(202, "Upload received; validate audio before provider calls."),
  };
}

function validationError(file) {
  const state = initialState();

  return {
    ...state,
    request: {
      id: "prototype-request-1",
      file: {
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        durationSeconds: file.durationSeconds,
      },
      rawTranscript: null,
      transcription: null,
    },
    pipeline: {
      phase: "rejected",
      legalNext: ["reset", "uploadValid", "uploadUnsupportedType", "uploadTooLarge"],
      steps: ["multipart audio received", "validation failed"],
    },
    response: problemResponse(400, file.code, file.detail, false),
  };
}

function transitionFrom(state, phases, buildPatch) {
  if (!phases.includes(state.pipeline.phase)) {
    return {
      ...state,
      response: problemResponse(
        409,
        "illegal_pipeline_transition",
        `Cannot run that action while phase is ${state.pipeline.phase}.`,
        false,
      ),
    };
  }

  const patch = buildPatch();

  return {
    ...state,
    ...patch,
  };
}

function advance(pipeline, phase, step) {
  return {
    phase,
    legalNext: legalNextFor(phase),
    steps: [...pipeline.steps, step],
  };
}

function cleanupSuccess(state, { cleanedText, uncertainties, step }) {
  return {
    pipeline: advance(state.pipeline, "ready-for-review", step),
    response: {
      status: 200,
      contentType: "application/json",
      body: {
        rawTranscript: state.request.rawTranscript,
        cleanedText,
        uncertainties,
      },
    },
  };
}

function providerError(state, { phase, code, detail, step }) {
  return {
    pipeline: advance(state.pipeline, phase, step),
    response: problemResponse(503, code, detail, true),
  };
}

function inFlightResponse(status, detail) {
  return {
    status,
    contentType: "application/json",
    body: {
      state: "processing",
      detail,
    },
  };
}

function problemResponse(status, code, detail, retryable) {
  return {
    status,
    contentType: "application/problem+json",
    body: {
      type: `https://smart-ai-text-to-speach-app.local/problems/${code}`,
      title: code,
      detail,
      retryable,
    },
  };
}

function legalNextFor(phase) {
  switch (phase) {
    case "validated":
      return ["transcribe", "transcriptionError"];
    case "transcribed":
      return ["cleanup", "paragraphCleanup", "uncertainCleanup", "cleanupError"];
    case "ready-for-review":
      return ["accept", "edit", "reset"];
    case "accepted":
    case "edited":
    case "rejected":
    case "transcription-failed":
    case "cleanup-failed":
      return ["reset", "uploadValid", "uploadUnsupportedType", "uploadTooLarge"];
    default:
      return ["uploadValid", "uploadUnsupportedType", "uploadTooLarge"];
  }
}

function appendEditMarker(text) {
  if (!text) {
    return null;
  }

  return `${text}\n\n[frontend local edit]`;
}
