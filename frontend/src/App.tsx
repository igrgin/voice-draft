import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Mic,
  RotateCcw,
  Square,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDictation,
  cleanTranscript,
  DictationProblemError,
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  RECORDING_FORMATS,
  type CleanupResult,
  type RecordingMimeType,
} from "./api";

import { ThemePicker } from "./ThemePicker";

type WorkflowPhase = "idle" | "recording" | "processing" | "review" | "error";
type ProcessingStep = "transcribing" | "cleaning";
type OutputAction = "copied" | "exported" | null;
type ProblemState = {
  message: string;
  code: string;
  retryable: boolean;
};
type RecordedAudio = {
  blob: Blob;
  mimeType: RecordingMimeType;
  durationSeconds: number;
  cleanupEnabled: boolean;
};

export function App() {
  const [cleanupEnabled, setCleanupEnabled] = useState(true);
  const [runCleanupEnabled, setRunCleanupEnabled] = useState(true);
  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [editedCleanedText, setEditedCleanedText] = useState("");
  const [activeTab, setActiveTab] = useState<"cleaned" | "raw" | "state">("cleaned");
  const [problem, setProblem] = useState<ProblemState | null>(null);
  const [outputAction, setOutputAction] = useState<OutputAction>(null);
  const [recordingMimeType, setRecordingMimeType] = useState<RecordingMimeType | null>(() => pickRecordingMimeType());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const rawTranscriptRef = useRef<string | null>(null);
  const cleanedResultRef = useRef<CleanupResult | null>(null);
  const draftsRef = useRef<{ raw?: string; cleaned?: string }>({});
  const recordingLimitTimerRef = useRef<number | null>(null);
  const lastRecordingRef = useRef<RecordedAudio | null>(null);

  useEffect(() => {
    return () => {
      clearRecordingLimitTimer();
      stopStreamTracks();
    };
  }, []);

  const outputLabel = (result ? runCleanupEnabled : cleanupEnabled) ? "Cleaned Text" : "Transcription";
  const busy = phase === "recording" || phase === "processing";

  const stateSummary = useMemo(
    () => ({
      endpoint: "POST /api/dictations",
      reviewOwner: "frontend local review",
      phase,
      processingStep,
      cleanupEnabled: runCleanupEnabled,
      recordingMimeType,
      rawTranscriptPresent: rawTranscriptRef.current !== null,
      cleanedTextPresent: Boolean(result?.cleanedText),
      editedTextLength: editedCleanedText.length,
      uncertaintyCount: result?.uncertainties.length ?? 0,
      retryableProblem: problem?.retryable ?? false,
      outputAction,
    }),
    [editedCleanedText.length, outputAction, phase, problem?.retryable, processingStep, recordingMimeType, result, runCleanupEnabled],
  );

  async function startRecording() {
    const selectedMimeType = pickRecordingMimeType();
    setRecordingMimeType(selectedMimeType);

    if (!selectedMimeType || !navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      showProblem({
        code: "unsupported_browser_recording",
        retryable: false,
        message: "This browser does not support the recording workflow required for the MVP.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });

      chunksRef.current = [];
      rawTranscriptRef.current = null;
      cleanedResultRef.current = null;
      draftsRef.current = {};
      lastRecordingRef.current = null;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = performance.now();
      setProblem(null);
      setResult(null);
      setEditedCleanedText("");
      setOutputAction(null);
      setProcessingStep(null);
      setRunCleanupEnabled(cleanupEnabled);
      setPhase("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const durationSeconds = Math.max(0.1, (performance.now() - recordingStartedAtRef.current) / 1000);
        const audio = new Blob(chunksRef.current, { type: selectedMimeType });
        const recordedAudio = { blob: audio, mimeType: selectedMimeType, durationSeconds, cleanupEnabled };
        const validationProblem = validateRecordedAudio(recordedAudio);

        if (validationProblem) {
          showProblem(validationProblem);
          return;
        }

        lastRecordingRef.current = recordedAudio;
        void processRecording(recordedAudio);
      };

      recorder.start();
      recordingLimitTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1000);
    } catch (recordingError) {
      clearRecordingLimitTimer();
      stopStreamTracks();
      showProblem({
        code: "recording_unavailable",
        retryable: false,
        message: recordingError instanceof Error ? recordingError.message : "Microphone recording could not be started.",
      });
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    clearRecordingLimitTimer();

    if (!recorder || recorder.state === "inactive") {
      stopStreamTracks();
      return;
    }

    recorder.stop();
    stopStreamTracks();
  }

  function validateRecordedAudio(recordedAudio: RecordedAudio): ProblemState | null {
    if (recordedAudio.blob.size === 0) {
      return {
        code: "empty_audio",
        retryable: false,
        message: "No browser-recorded audio was captured.",
      };
    }

    if (recordedAudio.blob.size > MAX_AUDIO_BYTES) {
      return {
        code: "audio_too_large",
        retryable: false,
        message: "The recorded audio exceeds the MVP request limit.",
      };
    }

    if (recordedAudio.durationSeconds > MAX_RECORDING_SECONDS) {
      return {
        code: "invalid_duration",
        retryable: false,
        message: "The recording is longer than the MVP duration limit.",
      };
    }

    return null;
  }

  async function retryLastRecording() {
    if (!lastRecordingRef.current || !problem?.retryable || busy) return;
    if (rawTranscriptRef.current !== null) {
      await processTranscript(runCleanupEnabled);
    } else {
      await processRecording({ ...lastRecordingRef.current, cleanupEnabled });
    }
  }

  async function changeCleanupMode(enabled: boolean) {
    setCleanupEnabled(enabled);
    if (rawTranscriptRef.current !== null) await processTranscript(enabled);
  }

  function showResult(nextResult: CleanupResult, applyCleanup: boolean) {
    setResult(nextResult);
    setEditedCleanedText((applyCleanup ? draftsRef.current.cleaned : draftsRef.current.raw) ?? nextResult.cleanedText);
    setOutputAction(null);
    setProcessingStep(null);
    setActiveTab("cleaned");
    setPhase("review");
  }

  async function processTranscript(applyCleanup: boolean) {
    const raw = rawTranscriptRef.current;
    if (raw === null) return;
    setRunCleanupEnabled(applyCleanup);
    setProblem(null);
    setOutputAction(null);
    setResult(null);
    setEditedCleanedText("");
    if (!applyCleanup) {
      showResult({ rawTranscript: raw, cleanedText: raw, uncertainties: [] }, false);
      return;
    }
    if (cleanedResultRef.current) {
      showResult(cleanedResultRef.current, true);
      return;
    }
    setPhase("processing");
    setProcessingStep("cleaning");
    try {
      const cleaned = await cleanTranscript(raw);
      cleanedResultRef.current = cleaned;
      showResult(cleaned, true);
    } catch (requestError) {
      showProblem(problemFromError(requestError));
    }
  }

  async function processRecording(recordedAudio: RecordedAudio) {
    setRunCleanupEnabled(recordedAudio.cleanupEnabled);
    setOutputAction(null);
    setProcessingStep("transcribing");
    setPhase("processing");
    setProblem(null);
    try {
      const transcription = await createDictation(recordedAudio.blob, {
        recordingMimeType: recordedAudio.mimeType,
        durationSeconds: recordedAudio.durationSeconds,
        cleanupEnabled: false,
      });
      rawTranscriptRef.current = transcription.rawTranscript;
      await processTranscript(recordedAudio.cleanupEnabled);
    } catch (requestError) {
      showProblem(problemFromError(requestError));
    }
  }

  function clearRecordingLimitTimer() {
    if (recordingLimitTimerRef.current !== null) {
      window.clearTimeout(recordingLimitTimerRef.current);
      recordingLimitTimerRef.current = null;
    }
  }

  function stopStreamTracks() {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;
  }

  function showProblem(nextProblem: ProblemState) {
    setProcessingStep(null);
    setProblem(nextProblem);
    setPhase("error");
  }

  async function copyEditedCleanedText() {
    if (!result) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is unavailable.");
      }

      await navigator.clipboard.writeText(editedCleanedText);
      setOutputAction("copied");
    } catch {
      showProblem({
        code: "copy_unavailable",
        retryable: false,
        message: `${outputLabel} could not be copied by this browser.`,
      });
    }
  }

  function exportEditedCleanedText() {
    if (!result) {
      return;
    }

    const exportBlob = new Blob([editedCleanedText], { type: "text/plain;charset=utf-8" });
    const exportUrl = URL.createObjectURL(exportBlob);
    const exportLink = document.createElement("a");
    exportLink.href = exportUrl;
    exportLink.download = runCleanupEnabled ? "cleaned-text.txt" : "transcription.txt";
    document.body.append(exportLink);
    exportLink.click();
    exportLink.remove();
    URL.revokeObjectURL(exportUrl);
    setOutputAction("exported");
  }

  return (
    <main className="app-shell">
      <section className="rail" aria-label="Dictation workflow">
        <div>
          <p className="eyebrow">Review Console</p>
          <h1>Voice Draft</h1>
        </div>

        {phase === "recording" ? (
          <button className="record-button stop" onClick={stopRecording}>
            <Square aria-hidden />
            <span>Stop recording</span>
          </button>
        ) : (
          <button className="record-button" onClick={startRecording} disabled={phase === "processing"}>
            {phase === "processing" ? <Loader2 aria-hidden className="spin" /> : <Mic aria-hidden />}
            <span>{phase === "processing" ? "Processing" : "Start recording"}</span>
          </button>
        )}

        <div className="cleanup-settings">
          <label className="cleanup-toggle">
            <span>AI cleanup</span>
            <input
              type="checkbox"
              role="switch"
              checked={cleanupEnabled}
              onChange={(event) => void changeCleanupMode(event.target.checked)}
              disabled={busy}
              aria-describedby="cleanup-description"
            />
          </label>
          <p id="cleanup-description" className="muted">
            {cleanupEnabled ? "Remove fillers and apply spoken paragraph commands." : "Transcription only, exactly as returned."}
          </p>
          <p className="muted">Switch modes to compare the same transcript. Edits are kept separately.</p>
        </div>

        <ol className="steps" aria-label="Workflow progress">
          <Step icon={<Mic aria-hidden />} label="Record" active={phase === "recording"} complete={phase === "processing" || phase === "review"} />
          <Step
            icon={<Waves aria-hidden />}
            label="Upload & transcribe"
            active={processingStep === "transcribing"}
            complete={isStepComplete("transcribing", processingStep, phase)}
          />
          {(busy || result ? runCleanupEnabled : cleanupEnabled) && (
            <Step
              icon={<Loader2 aria-hidden className={processingStep === "cleaning" ? "spin" : undefined} />}
              label="Cleanup"
              active={processingStep === "cleaning"}
              complete={phase === "review"}
            />
          )}
          <Step icon={<FileText aria-hidden />} label="Review" active={phase === "review"} complete={phase === "review"} />
        </ol>

        <ThemePicker />
      </section>

      <section className="workspace" aria-label="Cleanup Result">
        <div className="tabs" role="tablist" aria-label="Cleanup Result views">
          <TabButton active={activeTab === "cleaned"} onClick={() => setActiveTab("cleaned")}>
            {outputLabel}
          </TabButton>
          <TabButton active={activeTab === "raw"} onClick={() => setActiveTab("raw")}>
            Raw Transcript
          </TabButton>
          <TabButton active={activeTab === "state"} onClick={() => setActiveTab("state")}>
            State
          </TabButton>
        </div>

        <article className="text-surface">
          {activeTab === "cleaned" && (
            <textarea
              aria-label={outputLabel}
              value={editedCleanedText}
              onChange={(event) => {
                setEditedCleanedText(event.target.value);
                draftsRef.current[runCleanupEnabled ? "cleaned" : "raw"] = event.target.value;
                setOutputAction(null);
              }}
              readOnly={!result || busy}
              placeholder={`Record audio to see ${outputLabel}.`}
            />
          )}
          {activeTab === "raw" && (
            <pre aria-label="Raw Transcript">{rawTranscriptRef.current ?? "Raw Transcript will appear after upload."}</pre>
          )}
          {activeTab === "state" && <pre aria-label="State">{JSON.stringify(stateSummary, null, 2)}</pre>}
        </article>
      </section>

      <aside className="inspector" aria-label="Review inspector">
        <div className="status-card">
          {phase === "review" ? <CheckCircle2 aria-hidden /> : phase === "recording" ? <Mic aria-hidden /> : <Loader2 aria-hidden className={phase === "processing" ? "spin" : undefined} />}
          <div>
            <p className="card-label">Workflow State</p>
            <p>{statusText(phase, processingStep)}</p>
          </div>
        </div>

        {problem && (
          <div className="problem" role="alert">
            <AlertTriangle aria-hidden />
            <div>
              <span>{problem.message}</span>
              <small>{problem.code}</small>
            </div>
          </div>
        )}

        {problem?.retryable && lastRecordingRef.current && (
          <button className="secondary-action" onClick={retryLastRecording}>
            <RotateCcw aria-hidden />
            <span>{rawTranscriptRef.current !== null ? "Retry cleanup" : "Retry processing"}</span>
          </button>
        )}

        <div>
          <p className="card-label">Output</p>
          <div className="output-actions">
            <button className="secondary-action" onClick={copyEditedCleanedText} disabled={!result || busy} aria-label={`Copy ${outputLabel}`}>
              <Clipboard aria-hidden />
              <span>Copy</span>
            </button>
            <button className="secondary-action" onClick={exportEditedCleanedText} disabled={!result || busy} aria-label={`Export ${outputLabel}`}>
              <Download aria-hidden />
              <span>Export</span>
            </button>
          </div>
          <p className="muted">{outputStatusText(outputAction, Boolean(result), outputLabel)}</p>
        </div>

        <div>
          <p className="card-label">Cleanup Uncertainties</p>
          {result?.uncertainties.length ? (
            <ul className="uncertainties">
              {result.uncertainties.map((uncertainty) => (
                <li key={`${uncertainty.reasonCategory}:${uncertainty.text}`}>
                  <strong>{uncertainty.text}</strong>
                  <span>{uncertainty.reasonCategory}</span>
                  <p>{uncertainty.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{result && !runCleanupEnabled ? "AI cleanup was skipped for this recording." : "No review signals yet."}</p>
          )}
        </div>
      </aside>
    </main>
  );
}

function outputStatusText(outputAction: OutputAction, hasResult: boolean, outputLabel: string) {
  if (outputAction === "copied") {
    return `Copied edited ${outputLabel}.`;
  }

  if (outputAction === "exported") {
    return `Exported edited ${outputLabel}.`;
  }

  return hasResult ? "Waiting for local output." : "Waiting for review.";
}

function pickRecordingMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return null;
  }

  return RECORDING_FORMATS.find((format) => window.MediaRecorder.isTypeSupported(format.mimeType))?.mimeType ?? null;
}

function problemFromError(error: unknown): ProblemState {
  if (error instanceof DictationProblemError) {
    return {
      code: error.code,
      retryable: error.retryable,
      message: error.message,
    };
  }

  return {
    code: "dictation_request_failed",
    retryable: error instanceof TypeError,
    message: error instanceof Error ? error.message : "Dictation request failed.",
  };
}

function statusText(phase: WorkflowPhase, processingStep: ProcessingStep | null) {
  if (phase === "recording") {
    return "Recording microphone audio";
  }

  if (phase === "review") {
    return "Ready for review";
  }

  if (phase === "error") {
    return "Needs attention";
  }

  if (processingStep === "transcribing") {
    return "Uploading and transcribing audio";
  }

  if (processingStep === "cleaning") {
    return "Cleaning transcript";
  }

  return "Ready to record";
}

function isStepComplete(step: ProcessingStep, currentStep: ProcessingStep | null, phase: WorkflowPhase) {
  if (phase === "review") {
    return true;
  }

  const order: ProcessingStep[] = ["transcribing", "cleaning"];
  return currentStep !== null && order.indexOf(currentStep) > order.indexOf(step);
}

function Step({
  icon,
  label,
  active,
  complete,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <li className={active ? "active" : complete ? "complete" : ""}>
      {icon}
      <span>{label}</span>
    </li>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick} role="tab" aria-selected={active}>
      {children}
    </button>
  );
}
