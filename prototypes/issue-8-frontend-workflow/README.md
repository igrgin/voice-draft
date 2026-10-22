# PROTOTYPE - Issue #8 Frontend Recording and Review Workflow

Question: what should the React user flow look like for recording voice, seeing transcription progress, reviewing Raw Transcript and Cleaned Text, editing output, retrying failed steps, and copying/exporting the result?

Plan: three shadcn-based variants of a new throwaway React dictation flow, switchable via `?variant=`, under a standalone Vite prototype because the repo has no existing React route yet.

Run it with:

```bash
npm --prefix prototypes/issue-8-frontend-workflow install && npm --prefix prototypes/issue-8-frontend-workflow run dev
```

Then open the local Vite URL and switch variants with the floating bottom bar. Theme is URL-stable with `?theme=light` or `?theme=dark`.

- `?variant=A&theme=light` - Focused Composer, light blue
- `?variant=A&theme=dark` - Focused Composer, navy dark
- `?variant=B&theme=dark` - Operations Board
- `?variant=C&theme=dark` - Review Console

The prototype is throwaway. It uses in-memory state, mocked backend transitions, and no persistence.
