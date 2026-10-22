import { initialState, reduce } from "./pipelineModel.mjs";

const bold = "\x1b[1m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

let state = initialState();

const actions = new Map([
  ["u", { label: "upload valid audio", type: "uploadValid" }],
  ["m", { label: "upload unsupported media type", type: "uploadUnsupportedType" }],
  ["z", { label: "upload too large", type: "uploadTooLarge" }],
  ["v", { label: "validate upload", type: "validate" }],
  ["t", { label: "transcription succeeds", type: "transcribe" }],
  ["g", { label: "transcription provider fails", type: "transcriptionError" }],
  ["c", { label: "cleanup succeeds", type: "cleanup" }],
  ["p", { label: "cleanup handles Paragraph Command", type: "paragraphCleanup" }],
  ["?", { label: "cleanup surfaces uncertainty", type: "uncertainCleanup" }],
  ["e", { label: "cleanup provider fails", type: "cleanupError" }],
  ["a", { label: "frontend accepts result", type: "accept" }],
  ["d", { label: "frontend edits result", type: "edit" }],
  ["x", { label: "reset", type: "reset" }],
]);

render();

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.on("data", (input) => {
  for (const key of input) {
    if (key === "\u0003" || key === "q") {
      cleanupAndExit();
    }

    const action = actions.get(key);
    if (action) {
      state = reduce(state, action);
      render();
    }
  }
});

function render() {
  console.clear();
  console.log(`${bold}PROTOTYPE - Issue #7 Backend API and Processing Pipeline${reset}`);
  console.log(`${dim}Question: What endpoint and backend flow should turn uploaded audio into a Cleanup Result?${reset}`);
  console.log("");

  printSection("API sketch", state.api);
  printSection("Request", state.request ?? "none");
  printSection("Pipeline", state.pipeline);
  printSection("HTTP response", state.response ?? "none");
  printSection("Review state", state.review);

  console.log(`${bold}Keys${reset}`);
  console.log(
    [
      keyLabel("u", "valid upload"),
      keyLabel("m", "bad type"),
      keyLabel("z", "too large"),
      keyLabel("v", "validate"),
      keyLabel("t", "transcribe"),
      keyLabel("g", "transcribe error"),
      keyLabel("c", "cleanup"),
      keyLabel("p", "paragraph"),
      keyLabel("?", "uncertainty"),
      keyLabel("e", "cleanup error"),
      keyLabel("a", "accept"),
      keyLabel("d", "edit"),
      keyLabel("x", "reset"),
      keyLabel("q", "quit"),
    ].join("  "),
  );
  console.log("");
  console.log(`${dim}Legal next actions: ${state.pipeline.legalNext.join(", ")}${reset}`);
}

function printSection(title, value) {
  console.log(`${bold}${title}${reset}`);
  console.log(JSON.stringify(value, null, 2));
  console.log("");
}

function keyLabel(key, label) {
  return `${bold}[${key}]${reset} ${dim}${label}${reset}`;
}

function cleanupAndExit() {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  console.clear();
  process.exit(0);
}
