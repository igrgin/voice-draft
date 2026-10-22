# Research: Spring AI fit for transcription and cleanup

Date: 2026-07-08

Issue: [#4 Assess Spring AI fit for transcription and cleanup](https://github.com/igrgin/voice-draft/issues/4)

## Question

Which AI operations should be implemented through Spring AI, and where might the app need provider-specific APIs outside Spring AI? Investigate current Spring AI support for chat/text generation, structured outputs, audio transcription, prompt templating, tool/function calling if relevant, and provider coverage for the likely models.

## Recommendation

Use Spring AI as the default backend integration layer for the first transcription-and-cleanup product path: transcribe bounded uploaded audio with Spring AI's `TranscriptionModel`, then clean up the transcript with `ChatClient`/`ChatModel`, `PromptTemplate`, and structured output mapping. Spring AI documents portable chat APIs, prompt templates, structured-output converters, OpenAI-native JSON schema support, OpenAI transcription auto-configuration, and tool-calling support, so the ordinary "audio file in, cleaned transcript / notes out" workflow fits Spring AI well. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI Prompt API](https://docs.spring.io/spring-ai/reference/api/prompt.html), [Spring AI Structured Output](https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html), [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html), [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html), [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

Keep provider-specific escape hatches behind application-owned ports for features that are not a clean fit for Spring AI's current abstraction: OpenAI Realtime transcription for live transcript deltas, OpenAI Responses API features where OpenAI recommends Responses over Chat Completions for latest platform capabilities and reasoning models, and newer transcription options such as diarization-specific parameters if Spring AI's transcription options do not expose them when implemented. OpenAI documents realtime transcription sessions separately from file transcription, recommends Responses for new projects and reasoning models, and documents diarization-specific request fields on `/v1/audio/transcriptions`; Spring AI's OpenAI chat docs also state that official OpenAI reasoning text requires the separate Responses API, "not currently supported by this client." [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [OpenAI chat completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning), [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text), [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

| Area | Spring AI fit | Recommendation | Source |
| --- | --- | --- | --- |
| Chat/text cleanup | Strong. `ChatClient` supports synchronous and streaming calls, system/user messages, prompt options, and `ChatModel` implementations are meant as portable interfaces across providers. | Use Spring AI `ChatClient` for cleanup, summarization, punctuation, paragraphing, title extraction, and note formatting. | [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI Chat Model](https://docs.spring.io/spring-ai/reference/api/chatmodel.html) |
| Structured outputs | Strong with caveats. Spring AI has model-agnostic converters and `ChatClient.entity(...)`; provider-native structured output can be enabled, but Spring AI says native support varies by model/provider and generic conversion is best effort. | Use Spring AI structured output for app DTOs; enable provider-native structured output and validation/retry for important JSON contracts. | [Spring AI Structured Output](https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html), [Spring AI Chat Client entity responses](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI OpenAI Chat structured outputs](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html) |
| Audio transcription | Strong for bounded file transcription through OpenAI. Spring AI exposes `TranscriptionModel`; current supported transcription provider docs list OpenAI's Whisper API, and OpenAI transcriptions support Spring Boot auto-configuration. | Use Spring AI for the first server-side file transcription path. Prefer `gpt-4o-transcribe` or `gpt-4o-mini-transcribe` over the Spring AI default `whisper-1` when quality/cost testing supports it. | [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html), [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html), [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text) |
| Prompt templating | Strong. `PromptTemplate` renders variables through `TemplateRenderer`; the default renderer is StringTemplate with `{}` delimiters, and templates can create strings, messages, or prompts. | Use `PromptTemplate` for cleanup prompts so instructions, transcript text, locale, style, and output-format instructions are composed consistently. | [Spring AI Prompt API](https://docs.spring.io/spring-ai/reference/api/prompt.html) |
| Tool/function calling | Good, but not needed for the first cleanup loop unless the model must call app services. Spring AI says the app executes tools, `ChatClient` can handle tool-call loops through `ToolCallingAdvisor`, and chat-model support varies by provider. | Defer tools until there is a concrete tool use case, such as fetching project vocabulary or storing structured notes. When needed, use Spring AI tools and keep tool exposure request-scoped. | [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html), [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html) |
| Provider coverage/model choice | Good for chat providers; narrow for transcription. Spring AI lists chat support across OpenAI, Anthropic, Google GenAI, Mistral, Ollama, Amazon Bedrock Converse, and OpenAI-compatible providers, while transcription docs list OpenAI. | Treat provider portability as strong for text cleanup and weak for transcription. Start with OpenAI because both cleanup and transcription are available through one Spring AI starter. | [Spring AI project features](https://spring.io/projects/spring-ai/), [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html), [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html) |
| Provider-specific escape hatches | Necessary for realtime transcription, latest OpenAI Responses reasoning/built-in tools, and provider-specific transcription options not surfaced by Spring AI. Spring AI OpenAI chat supports `extra-body` for OpenAI-compatible servers but warns official OpenAI rejects unknown parameters. | Define application ports such as `TranscriptTranscriber` and `TranscriptCleanupModel`; implement Spring AI adapters first and reserve direct OpenAI adapters for specific gaps. | [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [OpenAI Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create), [Spring AI OpenAI Chat extra-body](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html) |

## Detailed Cited Findings

### Spring AI Baseline

Spring AI 2.0.0 is the current Spring AI project line identified by the Spring project page, and the project describes Spring AI as an application framework that applies Spring portability and modular design principles to AI engineering. [Spring AI project](https://spring.io/projects/spring-ai/)

Spring AI's project page says it supports major AI model providers such as Anthropic, OpenAI, Microsoft, Amazon, Google, and Ollama, and lists supported model types including chat completion, embedding, text-to-image, audio transcription, text-to-speech, and moderation. [Spring AI project](https://spring.io/projects/spring-ai/)

Spring AI's API overview says the Model API is portable across providers for chat, text-to-image, audio transcription, text-to-speech, and embeddings; it also says synchronous and streaming API options are supported and dropping down to model-specific features is supported. [Spring AI API overview](https://docs.spring.io/spring-ai/reference/api/index.html)

Spring AI's OpenAI chat docs say `spring-ai-starter-model-openai` provides Spring Boot auto-configuration for the OpenAI Chat Client, and the same starter is also used by the OpenAI transcription docs for OpenAI transcription auto-configuration. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html)

### Chat/Text Cleanup

`ChatClient` is a good fit for transcript cleanup because Spring AI documents it as a fluent API for communicating with an AI model, supporting both synchronous and streaming programming models, and building prompts from user messages, system messages, and prompt options such as model name and temperature. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html)

`ChatModel` is also a good portability boundary because Spring AI says the Chat Model API is designed as a simple, portable interface for interacting with different AI models and switching between models with minimal code changes. [Spring AI Chat Model](https://docs.spring.io/spring-ai/reference/api/chatmodel.html)

Spring AI's OpenAI chat integration exposes OpenAI-specific configuration for model, temperature, token limits, response format, tool choice, service tier, safety identifier, prompt cache key, headers, and other request options, so the cleanup model can start on the portable Spring AI surface and still set common OpenAI request controls when needed. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

OpenAI's model docs currently say to use GPT-5.5 when unsure or for complex reasoning/coding, and smaller variants such as GPT-5.4 mini or GPT-5.4 nano when optimizing for latency and cost; Spring AI's OpenAI chat docs also say the OpenAI chat model property can be set and currently defaults to `gpt-5-mini`. [OpenAI models](https://developers.openai.com/api/docs/models), [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

For this app, cleanup is likely a focused text transformation rather than a complex reasoning task, so the default implementation should make model choice configurable and benchmark quality/cost between the Spring AI default and the current OpenAI low-latency/cost recommendation at implementation time. This recommendation follows from Spring AI exposing `spring.ai.openai.chat.model` and OpenAI documenting different model choices for quality, latency, and cost. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [OpenAI models](https://developers.openai.com/api/docs/models)

### Structured Outputs

Spring AI's `StructuredOutputConverter` maps text model output into structured values such as Java classes or arrays, but Spring AI explicitly describes it as "best effort" and says the AI model is not guaranteed to return the requested structure, so validation is still required for important outputs. [Spring AI Structured Output](https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html)

Spring AI's `ChatClient` supports `entity(...)` response mapping for Java classes and parameterized types, which fits app outputs such as cleaned transcript text, title, summary bullets, detected language, confidence flags, and follow-up action items. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html)

Spring AI's `ChatClient.entity(...)` can enable provider-native structured output, but Spring AI says native structured output is not enabled by default because support varies significantly across models and providers. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html)

Spring AI can validate the model JSON response against an entity schema and retry on validation failure through `validateSchema()`, which fits the app's need for predictable DTOs from cleanup. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html)

Spring AI's OpenAI chat integration exposes OpenAI `JSON_OBJECT` and `JSON_SCHEMA` response formats; its docs say `JSON_SCHEMA` enables OpenAI Structured Outputs and requires a response-format schema, and the docs show both builder-based and property-based configuration. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

OpenAI's structured-output docs say Structured Outputs make responses adhere to a supplied JSON Schema, are available in latest large language models starting with GPT-4o, and are available through function calling or a JSON schema response format. [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

The practical decision is to use Spring AI structured output first, enable provider-native structured output for OpenAI cleanup calls where the selected model supports it, and add schema validation/retry for any response persisted by the app. This follows from Spring AI's generic and provider-native structured-output APIs and OpenAI's JSON Schema support. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

### Audio Transcription

Spring AI's Transcription API provides a unified `TranscriptionModel` interface for speech-to-text, including `call(AudioTranscriptionPrompt)` and convenience `transcribe(Resource)` methods. [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html)

The same Spring AI Transcription API page currently lists OpenAI's Whisper API as the supported provider, so transcription portability is narrower than chat portability. [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html)

Spring AI's OpenAI transcription docs say Spring AI supports OpenAI's transcription model, provide Spring Boot auto-configuration via `spring-ai-starter-model-openai`, and define configuration under `spring.ai.openai.audio.transcription`. [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html)

Spring AI's OpenAI transcription properties list `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1`, with `whisper-1` as the default, and expose response format, prompt, language, temperature, and timestamp granularity settings. [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html)

OpenAI's speech-to-text docs say file uploads for bounded audio support `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`, are limited to 25 MB, and should be used for file uploads and bounded requests rather than live transcript deltas. [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)

OpenAI's speech-to-text docs say the transcriptions endpoint supports `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, and `gpt-4o-transcribe-diarize`; the same docs say `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` support `json` or plain `text`, while `whisper-1` supports `json`, `text`, `srt`, `verbose_json`, and `vtt`. [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)

OpenAI's speech-to-text docs document diarization-specific behavior for `gpt-4o-transcribe-diarize`, including `diarized_json`, required `chunking_strategy` for audio longer than 30 seconds, optional known-speaker references, and a note that this model is available via `/v1/audio/transcriptions` only and not yet supported in the Realtime API. [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)

Because Spring AI's OpenAI transcription property table currently lists only `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and `whisper-1`, and does not document diarization-specific options such as `chunking_strategy` or known-speaker references, diarization should be treated as a provider-specific escape hatch until verified in Spring AI source or a later Spring AI release. [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html), [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)

Spring AI's Azure OpenAI transcription page says that as of Spring AI `2.0.0-M5`, OpenAI Transcriptions should be used to access OpenAI models deployed on Azure / Microsoft Foundry, so the app should not expect a separate Azure transcription abstraction. [Spring AI Azure OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/azure-openai-transcriptions.html)

### Realtime Audio

OpenAI's audio guide distinguishes request-based transcription for files from streaming transcription for live audio. [OpenAI audio guide](https://developers.openai.com/api/docs/guides/audio)

OpenAI's speech-to-text guide says bounded file-upload requests should use the speech-to-text guide, and applications needing live transcript deltas from a microphone, call, or media stream should use Realtime transcription instead. [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)

OpenAI's realtime transcription guide says realtime transcription sessions stream transcript deltas as audio arrives so users can see text before the full utterance is complete. [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)

Spring AI's transcription docs expose a request-style `TranscriptionModel` over an `AudioTranscriptionPrompt`/`Resource`, while OpenAI realtime transcription is a provider realtime session model; therefore live transcript deltas should be implemented through a provider-specific OpenAI realtime adapter if the product later needs live captions. [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html), [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)

### Prompt Templating

Spring AI's prompt docs say `Prompt` is a container for a series of `Message` objects and `ChatOptions`, and message roles include user, assistant, system, and tool. [Spring AI Prompt API](https://docs.spring.io/spring-ai/reference/api/prompt.html)

Spring AI's `PromptTemplate` renders templates through `TemplateRenderer`; the default implementation is based on StringTemplate and uses `{}` variable delimiters by default, with configurable delimiters and custom renderers available. [Spring AI Prompt API](https://docs.spring.io/spring-ai/reference/api/prompt.html)

Spring AI's structured-output docs also show format instructions inserted into user input through `PromptTemplate`, so cleanup prompts can combine task instructions, transcript text, locale, and structured-output format instructions through one Spring AI templating mechanism. [Spring AI Structured Output](https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html)

### Tool/Function Calling

Spring AI's tool-calling docs define tool calling as the pattern where a model can request calls to application APIs or tools, and they emphasize that the application executes the tool call while the model only requests the tool and provides input arguments. [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

Spring AI says it provides APIs to define tools, resolve tool call requests, and execute tool calls; it also says `ChatClient` handles tool call requests automatically through `ToolCallingAdvisor`, while direct `ChatModel` calls send tool definitions but do not execute tool calls automatically. [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

Spring AI supports method-based tools through `@Tool` and `@ToolParam`, `ToolCallback` beans, default tools, request-scoped tools, and dynamic resolution by tool name; Spring AI also warns that default tools are shared across requests and can be dangerous if exposed too broadly. [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

OpenAI's function-calling docs define function calling as a way for models to interface with external systems and access application-provided data/actions, matching Spring AI's tool-calling abstraction. [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)

The first transcription cleanup path does not require tool calling unless the model must retrieve project/user vocabulary, inspect stored preferences, or perform actions such as saving notes; if such a need appears, Spring AI tools should be exposed per request rather than globally. This recommendation follows from Spring AI's request-scoped `tools(...)` support and its warning about default tools. [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

### Provider Coverage and Model Choice

Spring AI's chat-model comparison table lists many chat providers and capabilities, including Anthropic Claude, DeepSeek, Google GenAI, Groq, Mistral AI, MiniMax, NVIDIA, Ollama, OpenAI, Perplexity, and Amazon Bedrock Converse. [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html)

The same Spring AI chat comparison table says OpenAI chat supports text, image, and audio input, text and audio output, tools/functions, streaming, retry, observability, and built-in JSON, but not local deployment. [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html)

The comparison table says Google GenAI supports text, PDF, image, audio, and video input; Anthropic Claude supports text, PDF, and image; Mistral supports text, image, and audio; Ollama supports local deployment; and OpenAI-compatible providers such as DeepSeek, Groq, NVIDIA, and Perplexity are represented with provider-specific capability differences. [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html)

Spring AI's OpenAI chat docs say OpenAI chat can accept audio media through `gpt-audio` and currently supports `audio/mp3` and `audio/wav` media types for that chat path, but this is separate from the transcription API that accepts uploaded audio files. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html)

Because chat provider coverage is broad but transcription provider coverage is currently OpenAI-focused in Spring AI docs, the app should design text cleanup behind a provider-neutral interface and transcription behind an interface whose first adapter is OpenAI/Spring AI. [Spring AI Chat Model comparison](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html), [Spring AI Transcription API](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions.html)

### Provider-Specific Escape Hatches

OpenAI's Chat Completions API reference says new projects should try Responses to take advantage of the latest OpenAI platform features, while Chat Completions remains supported. [OpenAI chat completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)

OpenAI's Responses API reference says `POST /responses` can generate text or JSON outputs and can have the model call custom code or use built-in tools such as web search and file search. [OpenAI Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)

OpenAI's reasoning guide says reasoning models work better with the Responses API and that improved model intelligence and performance are available through Responses, even though Chat Completions is still supported. [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)

Spring AI's OpenAI chat docs state that official OpenAI reasoning models do not expose reasoning text in Chat Completions responses and that accessing actual reasoning text requires OpenAI's separate Responses API, "not currently supported by this client." [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

Spring AI's OpenAI chat docs expose an `extra-body` option for OpenAI-compatible servers but say the official OpenAI API rejects unknown parameters with a 400 error, so `extra-body` is useful for OpenAI-compatible servers but is not a general escape hatch for unsupported official OpenAI parameters. [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html)

Therefore the code should avoid binding controllers directly to Spring AI classes; instead, define app-level ports for transcription and cleanup, use Spring AI adapters by default, and add direct OpenAI adapters only for concrete gaps such as realtime transcription, Responses-only workflows, or diarization fields not exposed by Spring AI. This follows from Spring AI's stated portability goal, its documented model-specific feature support, and OpenAI's separate APIs for realtime and Responses. [Spring AI project](https://spring.io/projects/spring-ai/), [Spring AI API overview](https://docs.spring.io/spring-ai/reference/api/index.html), [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [OpenAI Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)

## Decision

Implement the first AI path through Spring AI:

1. Use Spring AI OpenAI transcription for bounded server-side audio uploads, with model/configuration selected through properties and quality tested between `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, and the Spring AI default `whisper-1`. [Spring AI OpenAI Transcriptions](https://docs.spring.io/spring-ai/reference/api/audio/transcriptions/openai-transcriptions.html), [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
2. Use Spring AI `ChatClient` for transcript cleanup, with `PromptTemplate` for reusable cleanup prompts and `ChatClient.entity(...)` or `StructuredOutputConverter` for typed results. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI Prompt API](https://docs.spring.io/spring-ai/reference/api/prompt.html), [Spring AI Structured Output](https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html)
3. Use OpenAI-native structured output through Spring AI for important JSON outputs when the selected model supports it, and add schema validation/retry for persisted app results. [Spring AI Chat Client](https://docs.spring.io/spring-ai/reference/api/chatclient.html), [Spring AI OpenAI Chat](https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
4. Do not implement tool calling in the first pass unless a concrete app service must be called by the model; if tools become necessary, expose them through Spring AI's tool APIs on specific requests. [Spring AI Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)
5. Keep direct provider adapters available for OpenAI Realtime transcription, OpenAI Responses-only reasoning or built-in-tool features, and transcription diarization options that Spring AI does not expose in the selected release. [OpenAI realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [OpenAI Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create), [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
