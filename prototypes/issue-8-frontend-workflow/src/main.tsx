import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  FileText,
  Mic,
  Moon,
  Play,
  RefreshCcw,
  RotateCcw,
  Square,
  Sun,
  Upload,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./styles.css";

// PROTOTYPE - Issue #8 frontend recording and review workflow.
// Fresh shadcn pass: three variants of the dictation workflow, switchable via ?variant=.

type Phase =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "transcribing"
  | "cleaning"
  | "review"
  | "edited"
  | "copied"
  | "exported"
  | "transcription-error"
  | "cleanup-error";

type Theme = "light" | "dark";
type VariantKey = "A" | "B" | "C";

type CleanupUncertainty = {
  text: string;
  reason: string;
};

type WorkflowState = {
  phase: Phase;
  recordingSeconds: number;
  recordingMimeType: string;
  endpoint: "POST /api/dictations";
  rawTranscript: string;
  cleanedText: string;
  editedText: string;
  uncertainties: CleanupUncertainty[];
  lastProblem: null | {
    code: string;
    detail: string;
    retryable: boolean;
    step: "transcription" | "cleanup";
  };
  output: null | "copied" | "exported";
};

type WorkflowAction =
  | "start"
  | "stop"
  | "upload"
  | "advance"
  | "fail-transcription"
  | "fail-cleanup"
  | "retry"
  | "reset"
  | "copy"
  | "export";

type VariantProps = {
  state: WorkflowState;
  editedText: string;
  setEditedText: (value: string) => void;
  dispatch: (action: WorkflowAction) => void;
};

const sampleRawTranscript =
  "um this is a quick note about open ai and spring boot new paragraph i think the upload flow should stay simple but maybe we should make the retry obvious";

const sampleCleanedText =
  "This is a quick note about OpenAI and Spring Boot.\n\nI think the upload flow should stay simple, but maybe we should make the retry obvious.";

const initialState: WorkflowState = {
  phase: "idle",
  recordingSeconds: 0,
  recordingMimeType: "audio/webm",
  endpoint: "POST /api/dictations",
  rawTranscript: "",
  cleanedText: "",
  editedText: "",
  uncertainties: [],
  lastProblem: null,
  output: null,
};

const variants: Array<{ key: VariantKey; name: string }> = [
  { key: "A", name: "Focused Composer" },
  { key: "B", name: "Operations Board" },
  { key: "C", name: "Review Console" },
];

const steps: Array<{ phase: Phase; label: string }> = [
  { phase: "recording", label: "Record" },
  { phase: "uploading", label: "Upload" },
  { phase: "transcribing", label: "Transcribe" },
  { phase: "cleaning", label: "Clean" },
  { phase: "review", label: "Review" },
];

function reduceWorkflow(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action) {
    case "start":
      return { ...initialState, phase: "recording", recordingSeconds: 18 };
    case "stop":
      return state.phase === "recording"
        ? { ...state, phase: "recorded", recordingSeconds: 42 }
        : state;
    case "upload":
      return state.phase === "recorded"
        ? { ...state, phase: "uploading", lastProblem: null, output: null }
        : state;
    case "advance":
      if (state.phase === "uploading") return { ...state, phase: "transcribing" };
      if (state.phase === "transcribing") {
        return { ...state, phase: "cleaning", rawTranscript: sampleRawTranscript };
      }
      if (state.phase === "cleaning") {
        return {
          ...state,
          phase: "review",
          cleanedText: sampleCleanedText,
          editedText: sampleCleanedText,
          uncertainties: [
            {
              text: "maybe",
              reason: "Hedging Language preserved during Conservative Cleanup.",
            },
          ],
        };
      }
      return state;
    case "fail-transcription":
      return state.phase === "transcribing"
        ? {
            ...state,
            phase: "transcription-error",
            lastProblem: {
              code: "transcription_provider_unavailable",
              detail: "The transcription provider failed or timed out.",
              retryable: true,
              step: "transcription",
            },
          }
        : state;
    case "fail-cleanup":
      return state.phase === "cleaning"
        ? {
            ...state,
            phase: "cleanup-error",
            rawTranscript: state.rawTranscript || sampleRawTranscript,
            lastProblem: {
              code: "cleanup_provider_unavailable",
              detail: "Cleanup failed after Raw Transcript was produced.",
              retryable: true,
              step: "cleanup",
            },
          }
        : state;
    case "retry":
      if (state.phase === "transcription-error") return { ...state, phase: "transcribing", lastProblem: null };
      if (state.phase === "cleanup-error") return { ...state, phase: "cleaning", lastProblem: null };
      return state;
    case "copy":
      return canReview(state.phase) ? { ...state, phase: "copied", output: "copied" } : state;
    case "export":
      return canReview(state.phase) ? { ...state, phase: "exported", output: "exported" } : state;
    case "reset":
      return initialState;
    default:
      return state;
  }
}

function App() {
  const [variant, setVariant] = useVariant();
  const [theme, setTheme] = useTheme();
  const [state, setState] = useState(initialState);
  const [editedText, setEditedTextValue] = useState("");

  const dispatch = (action: WorkflowAction) => {
    setState((current) => reduceWorkflow(current, action));
  };

  const setEditedText = (value: string) => {
    setEditedTextValue(value);
    setState((current) => ({
      ...current,
      phase: canReview(current.phase) ? "edited" : current.phase,
      editedText: value,
      output: null,
    }));
  };

  useEffect(() => {
    if (state.cleanedText && !editedText) {
      setEditedTextValue(state.cleanedText);
    }
  }, [editedText, state.cleanedText]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const props = { state: { ...state, editedText }, editedText, setEditedText, dispatch };

  return (
    <TooltipProvider>
      <main className="prototype-page">
        <PrototypeHeader theme={theme} onThemeChange={setTheme} />
        {variant === "A" && <FocusedComposer {...props} />}
        {variant === "B" && <OperationsBoard {...props} />}
        {variant === "C" && <ReviewConsole {...props} />}
        <PrototypeSwitcher current={variant} onChange={setVariant} />
      </main>
    </TooltipProvider>
  );
}

function PrototypeHeader({
  theme,
  onThemeChange,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  return (
    <header className="prototype-header">
      <div>
        <p className="prototype-eyebrow">PROTOTYPE - SHADCN RESTART</p>
        <h1>Dictation Workspace</h1>
      </div>
      <div className="header-actions">
        <div className="theme-switch">
          <Sun className="size-4" />
          <Switch checked={theme === "dark"} onCheckedChange={(checked) => onThemeChange(checked ? "dark" : "light")} />
          <Moon className="size-4" />
        </div>
        <Badge variant="secondary">{theme === "dark" ? "Navy dark" : "Light blue"}</Badge>
      </div>
    </header>
  );
}

function FocusedComposer({ state, editedText, setEditedText, dispatch }: VariantProps) {
  return (
    <section className="variant-grid variant-focused">
      <aside className="left-stack">
        <RecorderCard state={state} dispatch={dispatch} />
        <ProgressCard state={state} vertical />
      </aside>
      <section className="center-stack">
        <WorkflowToolbar state={state} dispatch={dispatch} />
        <EditorPanel state={state} editedText={editedText} setEditedText={setEditedText} large />
      </section>
      <aside className="right-stack">
        <ResultMetaCard state={state} />
        <RawTranscriptCard state={state} />
        <StateCard state={state} />
      </aside>
    </section>
  );
}

function OperationsBoard({ state, editedText, setEditedText, dispatch }: VariantProps) {
  return (
    <section className="variant-board">
      <WorkflowToolbar state={state} dispatch={dispatch} wide />
      <div className="board-columns">
        <BoardColumn title="Capture" active={["idle", "recording", "recorded"].includes(state.phase)}>
          <RecorderCard state={state} dispatch={dispatch} />
        </BoardColumn>
        <BoardColumn title="Processing" active={["uploading", "transcribing", "cleaning"].includes(normalizePhase(state.phase))}>
          <ProgressCard state={state} />
          <ProblemCard state={state} dispatch={dispatch} />
        </BoardColumn>
        <BoardColumn title="Review" active={canReview(state.phase)}>
          <EditorPanel state={state} editedText={editedText} setEditedText={setEditedText} compact />
          <ResultMetaCard state={state} />
        </BoardColumn>
        <BoardColumn title="Output" active={state.output !== null}>
          <OutputCard state={state} dispatch={dispatch} />
          <StateCard state={state} compact />
        </BoardColumn>
      </div>
    </section>
  );
}

function ReviewConsole({ state, editedText, setEditedText, dispatch }: VariantProps) {
  return (
    <section className="variant-console">
      <aside className="console-rail">
        <RecorderCard state={state} dispatch={dispatch} />
        <ProgressCard state={state} vertical />
      </aside>
      <section className="console-main">
        <Tabs defaultValue="cleaned" className="h-full">
          <div className="console-main-topbar">
            <TabsList>
              <TabsTrigger value="cleaned">Cleaned Text</TabsTrigger>
              <TabsTrigger value="raw">Raw Transcript</TabsTrigger>
              <TabsTrigger value="state">State</TabsTrigger>
            </TabsList>
            <WorkflowToolbar state={state} dispatch={dispatch} inline />
          </div>
          <TabsContent value="cleaned" className="min-h-0">
            <ReviewTextSurface
              title="Cleaned Text"
              description="Plain Text Cleanup stays editable before copy or export."
              icon={<Wand2 className="size-4 text-primary" />}
              badge={<StatusBadge phase={state.phase} />}
              value={canReview(state.phase) ? editedText : ""}
              placeholder="Cleaned Text appears after transcription and Conservative Cleanup."
              onChange={setEditedText}
              editable={canReview(state.phase)}
            />
          </TabsContent>
          <TabsContent value="raw" className="min-h-0">
            <ReviewTextSurface
              title="Raw Transcript"
              description="Read-only source text returned by transcription."
              icon={<FileText className="size-4 text-primary" />}
              value={state.rawTranscript}
              placeholder="Raw Transcript appears after transcription succeeds or cleanup fails after transcription."
              editable={false}
            />
          </TabsContent>
          <TabsContent value="state" className="min-h-0">
            <ReviewTextSurface
              title="State"
              description="Read-only full relevant prototype state."
              value={formatState(state)}
              editable={false}
              monospace
            />
          </TabsContent>
        </Tabs>
      </section>
      <aside className="console-inspector">
        <ResultMetaCard state={state} />
        <ProblemCard state={state} dispatch={dispatch} />
        <OutputCard state={state} dispatch={dispatch} />
      </aside>
    </section>
  );
}

function RecorderCard({ state, dispatch }: { state: WorkflowState; dispatch: (action: WorkflowAction) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-4 text-primary" />
          Recording
        </CardTitle>
        <CardDescription>{state.recordingMimeType}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="recording-meter">
          <span className={cn("recording-dot", state.phase === "recording" && "recording-dot-live")} />
          <span>{state.phase === "recording" ? "Recording" : state.phase === "recorded" ? "Ready to upload" : "Idle"}</span>
          <strong>{state.recordingSeconds}s</strong>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => dispatch("start")} disabled={state.phase === "recording"}>
            <Mic className="size-4" />
            Start
          </Button>
          <Button variant="secondary" onClick={() => dispatch("stop")} disabled={state.phase !== "recording"}>
            <Square className="size-4" />
            Stop
          </Button>
          <Button className="col-span-2" variant="outline" onClick={() => dispatch("upload")} disabled={state.phase !== "recorded"}>
            <Upload className="size-4" />
            Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowToolbar({
  state,
  dispatch,
  stacked = false,
  wide = false,
  inline = false,
}: {
  state: WorkflowState;
  dispatch: (action: WorkflowAction) => void;
  stacked?: boolean;
  wide?: boolean;
  inline?: boolean;
}) {
  const controls = (
    <>
      <StatusBadge phase={state.phase} />
      <Button onClick={() => dispatch("advance")} disabled={!["uploading", "transcribing", "cleaning"].includes(state.phase)}>
        <Play className="size-4" />
        Next
      </Button>
      <Button variant="destructive" onClick={() => dispatch("fail-transcription")} disabled={state.phase !== "transcribing"}>
        <AlertTriangle className="size-4" />
        Transcription
      </Button>
      <Button variant="destructive" onClick={() => dispatch("fail-cleanup")} disabled={state.phase !== "cleaning"}>
        <AlertTriangle className="size-4" />
        Cleanup
      </Button>
      <Button variant="outline" onClick={() => dispatch("retry")} disabled={!state.lastProblem?.retryable}>
        <RefreshCcw className="size-4" />
        Retry
      </Button>
      <Button variant="secondary" onClick={() => dispatch("reset")}>
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </>
  );

  if (inline) {
    return (
      <div className="toolbar-content toolbar-inline">
        <StatusBadge phase={state.phase} />
        <ToolbarIconButton label="Next" onClick={() => dispatch("advance")} disabled={!["uploading", "transcribing", "cleaning"].includes(state.phase)}>
          <Play className="size-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Transcription failure" variant="destructive" onClick={() => dispatch("fail-transcription")} disabled={state.phase !== "transcribing"}>
          <AlertTriangle className="size-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Cleanup failure" variant="destructive" onClick={() => dispatch("fail-cleanup")} disabled={state.phase !== "cleaning"}>
          <AlertTriangle className="size-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Retry" variant="outline" onClick={() => dispatch("retry")} disabled={!state.lastProblem?.retryable}>
          <RefreshCcw className="size-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Reset" variant="secondary" onClick={() => dispatch("reset")}>
          <RotateCcw className="size-4" />
        </ToolbarIconButton>
      </div>
    );
  }

  return (
    <Card size="sm" className={cn(wide && "toolbar-card")}>
      <CardContent className={cn("toolbar-content", stacked && "toolbar-stacked")}>
        {controls}
      </CardContent>
    </Card>
  );
}

function ToolbarIconButton({
  label,
  children,
  variant = "default",
  disabled = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant={variant} disabled={disabled} onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function EditorPanel({
  state,
  editedText,
  setEditedText,
  large = false,
  compact = false,
}: {
  state: WorkflowState;
  editedText: string;
  setEditedText: (value: string) => void;
  large?: boolean;
  compact?: boolean;
}) {
  const disabled = !canReview(state.phase);
  return (
    <Card className="editor-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-4 text-primary" />
          Cleaned Text
          <StatusBadge phase={state.phase} />
        </CardTitle>
        <CardDescription>Plain Text Cleanup stays editable before copy or export.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0">
        <Textarea
          className={cn("editor-textarea", large && "editor-textarea-large", compact && "editor-textarea-compact")}
          value={disabled ? "" : editedText}
          onChange={(event) => setEditedText(event.target.value)}
          disabled={disabled}
          placeholder="Cleaned Text appears after transcription and Conservative Cleanup."
        />
      </CardContent>
    </Card>
  );
}

function ReviewTextSurface({
  title,
  description,
  icon,
  badge,
  value,
  placeholder,
  editable,
  onChange,
  monospace = false,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  value: string;
  placeholder?: string;
  editable: boolean;
  onChange?: (value: string) => void;
  monospace?: boolean;
}) {
  return (
    <Card className="review-surface-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {badge}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0">
        <Textarea
          className={cn("review-surface-textarea", monospace && "review-surface-textarea-code")}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={!editable}
        />
      </CardContent>
    </Card>
  );
}

function ProgressCard({ state, vertical = false }: { state: WorkflowState; vertical?: boolean }) {
  const currentIndex = steps.findIndex((step) => step.phase === normalizePhase(state.phase));
  const value = currentIndex < 0 ? 0 : ((currentIndex + 1) / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow</CardTitle>
        <CardDescription>{state.endpoint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={value} />
        <div className={cn("step-list", vertical && "step-list-vertical")}>
          {steps.map((step, index) => {
            const active = step.phase === normalizePhase(state.phase);
            const done = currentIndex > index || canReview(state.phase);
            return (
              <div key={step.phase} className={cn("step-item", active && "step-item-active")}>
                <span>{done ? <Check className="size-3" /> : index + 1}</span>
                <p>{step.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultMetaCard({ state }: { state: WorkflowState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Signals</CardTitle>
        <CardDescription>Cleanup Uncertainty is review material, not an error.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.uncertainties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Cleanup Uncertainties surfaced.</p>
        ) : (
          state.uncertainties.map((uncertainty) => (
            <div className="rounded-lg border bg-muted/40 p-3" key={uncertainty.text}>
              <strong className="text-sm">{uncertainty.text}</strong>
              <p className="mt-1 text-sm text-muted-foreground">{uncertainty.reason}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RawTranscriptCard({ state, roomy = false }: { state: WorkflowState; roomy?: boolean }) {
  return (
    <Card className={cn(roomy && "h-full")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          Raw Transcript
        </CardTitle>
        <CardDescription>Hidden from the primary result flow by default.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className={cn("text-sm leading-6 text-muted-foreground", roomy && "text-base")}>
          {state.rawTranscript || "Raw Transcript appears after transcription succeeds or cleanup fails after transcription."}
        </p>
      </CardContent>
    </Card>
  );
}

function ProblemCard({ state, dispatch }: { state: WorkflowState; dispatch: (action: WorkflowAction) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" />
          Retry
        </CardTitle>
        <CardDescription>Provider failures are retryable problem responses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.lastProblem ? (
          <>
            <Badge variant="destructive">{state.lastProblem.code}</Badge>
            <p className="text-sm text-muted-foreground">{state.lastProblem.detail}</p>
            <Button variant="outline" onClick={() => dispatch("retry")}>
              <RefreshCcw className="size-4" />
              Retry {state.lastProblem.step}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No retryable failure.</p>
        )}
      </CardContent>
    </Card>
  );
}

function OutputCard({ state, dispatch }: { state: WorkflowState; dispatch: (action: WorkflowAction) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Output</CardTitle>
        <CardDescription>Copy/export use local edited Cleaned Text.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!canReview(state.phase)} onClick={() => dispatch("copy")}>
            <Clipboard className="size-4" />
            Copy
          </Button>
          <Button variant="outline" disabled={!canReview(state.phase)} onClick={() => dispatch("export")}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {state.output === "copied"
            ? "Copied."
            : state.output === "exported"
              ? "Exported."
              : "Waiting for review."}
        </p>
      </CardContent>
    </Card>
  );
}

function StateCard({ state, compact = false }: { state: WorkflowState; compact?: boolean }) {
  return (
    <Card className="state-card">
      <CardHeader>
        <CardTitle>State</CardTitle>
        <CardDescription>Full relevant prototype state.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn("state-scroll", compact && "state-scroll-compact")}>
          <pre>{formatState(state)}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function formatState(state: WorkflowState) {
  return JSON.stringify(
    {
      phase: state.phase,
      endpoint: state.endpoint,
      recordingSeconds: state.recordingSeconds,
      rawTranscriptPresent: Boolean(state.rawTranscript),
      cleanedTextPresent: Boolean(state.cleanedText),
      editedTextLength: state.editedText.length,
      uncertainties: state.uncertainties,
      lastProblem: state.lastProblem,
      output: state.output,
    },
    null,
    2,
  );
}

function BoardColumn({
  title,
  active,
  children,
}: {
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("board-column", active && "board-column-active")}>
      <div className="board-column-header">
        <h2>{title}</h2>
        {active && <Badge>Active</Badge>}
      </div>
      <Separator />
      {children}
    </section>
  );
}

function StatusBadge({ phase }: { phase: Phase }) {
  const retry = phase.endsWith("error");
  const ready = canReview(phase);
  return (
    <Badge variant={retry ? "destructive" : ready ? "default" : "secondary"}>
      {phase.replace("-", " ")}
    </Badge>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: VariantKey;
  onChange: (variant: VariantKey) => void;
}) {
  const currentIndex = variants.findIndex((variant) => variant.key === current);
  const selected = variants[currentIndex] ?? variants[0];

  const move = (direction: -1 | 1) => {
    const nextIndex = (currentIndex + direction + variants.length) % variants.length;
    onChange(variants[nextIndex].key);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (editing) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (import.meta.env.PROD) return null;

  return (
    <nav className="prototype-switcher" aria-label="Prototype variants">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="secondary" onClick={() => move(-1)} aria-label="Previous variant">
            <ChevronLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous variant</TooltipContent>
      </Tooltip>
      <strong>
        {selected.key} - {selected.name}
      </strong>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="secondary" onClick={() => move(1)} aria-label="Next variant">
            <ChevronRight className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next variant</TooltipContent>
      </Tooltip>
    </nav>
  );
}

function canReview(phase: Phase) {
  return phase === "review" || phase === "edited" || phase === "copied" || phase === "exported";
}

function normalizePhase(phase: Phase): Phase {
  if (phase === "idle" || phase === "recorded") return "recording";
  if (phase === "transcription-error") return "transcribing";
  if (phase === "cleanup-error") return "cleaning";
  if (phase === "edited" || phase === "copied" || phase === "exported") return "review";
  return phase;
}

function useVariant() {
  const initialVariant = useMemo(() => {
    const param = new URLSearchParams(window.location.search).get("variant");
    return param === "B" || param === "C" ? param : "A";
  }, []);
  const [variant, setVariant] = useState<VariantKey>(initialVariant);

  const updateVariant = (nextVariant: VariantKey) => {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", nextVariant);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    setVariant(nextVariant);
  };

  return [variant, updateVariant] as const;
}

function useTheme() {
  const initialTheme = useMemo(() => {
    const param = new URLSearchParams(window.location.search).get("theme");
    return param === "dark" ? "dark" : "light";
  }, []);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const updateTheme = (nextTheme: Theme) => {
    const params = new URLSearchParams(window.location.search);
    params.set("theme", nextTheme);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    setTheme(nextTheme);
  };

  return [theme, updateTheme] as const;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
