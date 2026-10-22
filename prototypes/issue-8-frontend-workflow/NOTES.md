# Issue #8 Prototype Notes

## Question

What should the React user flow look like for recording voice, seeing transcription progress, reviewing Raw Transcript and Cleaned Text, editing output, retrying failed steps, and copying/exporting the result?

## Inputs Read First

- Top-level map: GitHub issue #1
- Blockers: GitHub issues #3 and #5
- Research: `docs/research/issue-2-current-java-spring-ai-react-stack.md`, `docs/research/issue-3-speech-capture-and-transcription-path.md`, and `docs/research/issue-4-spring-ai-fit-for-transcription-and-cleanup.md`
- Backend prototype decision: `prototypes/issue-7-backend-pipeline/NOTES.md`
- Domain language: `CONTEXT.md`

## Prototype Shape

Restarted with shadcn components and Tailwind v4 after human feedback: "Let's start over. This time use Shadcn."

Three variants are available from one Vite route:

- `A - Focused Composer`: shadcn card layout with recording/progress left, Cleaned Text center, review/state right.
- `B - Operations Board`: shadcn column board for capture, processing, review, and output.
- `C - Review Console`: shadcn tabbed review surface with recorder and inspector rails.

All variants use the same in-memory workflow state and the same mocked contract:

- React records bounded audio with `getUserMedia()` / `MediaRecorder` semantics.
- Upload target is `POST /api/dictations`.
- Backend result shape is a Cleanup Result with Raw Transcript, Cleaned Text, and Cleanup Uncertainties.
- Review/edit/copy/export stay frontend-local because persistence, history, auth, and retention are unspecified.
- Transcription and cleanup provider failures are retryable.

## Verdict

Previous direction before restart: keep the layout and workflow emphasis from `A - Focused Composer`, but move the visual direction away from the original green palette. Preferred palette direction was light blue light mode plus navy blue dark mode.

Accepted direction: `C - Review Console` is the chosen interaction model for issue #8. Promote the shadcn tabbed review surface with the recorder and workflow progress as the left rail, the Cleaned Text / Raw Transcript / State tabs as the primary workspace, and review/output/problem details as the right inspector.

Responsive follow-up: on tablet and phone widths, the `C - Review Console` review surface should keep a viewport-relative text area instead of shrinking to content height after the rails stack. The Cleaned Text, Raw Transcript, and State tabs now share that adaptive surface sizing.

Human review accepted this direction. Delete this throwaway prototype or promote the accepted interaction model before implementation.
