# PROTOTYPE - Issue #7 Backend API and Processing Pipeline

Question: what backend API and processing pipeline should the Spring Boot app expose for audio upload, transcription, Conservative Cleanup, Paragraph Command handling, result review, and errors?

Assumption: this is a logic/state prototype, not a UI prototype. The blockers decided that MVP capture is browser `MediaRecorder` plus bounded multipart upload to Spring Boot, with realtime streaming deferred until live partial transcripts become a product requirement.

Run it with:

```bash
node prototypes/issue-7-backend-pipeline/prototype.mjs
```

The prototype is throwaway. Drive the pipeline with the keyboard and watch the full state after every action. The pure reducer lives in `pipelineModel.mjs`; the terminal shell is only there to exercise the API and processing shape by hand.
