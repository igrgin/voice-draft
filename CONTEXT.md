# Voice Draft

This context describes the language for a web app that turns recorded speech into polished written text.

## Language

**Raw Transcript**:
The direct text produced from recorded speech before cleanup. It is useful for review and debugging, but it is not the app's main user-facing artifact and is hidden from the primary result flow by default.
_Avoid_: Provider output, transcription result

**Cleaned Text**:
Readable prose that preserves the speaker's intended meaning after filler removal, punctuation, Paragraph Command handling, and basic cleanup.
_Avoid_: Final transcript, polished transcript, cleaned transcript

**Conservative Cleanup**:
The default cleanup policy for producing Cleaned Text: preserve the speaker's wording, tone, and ordering unless changing the text removes filler, fixes obvious speech or transcription noise, improves basic readability, applies Punctuation Inference, or applies a Paragraph Command.
_Avoid_: Rewrite, summarization, paraphrase

**Style Action**:
An editor-side transformation that changes presentation or intent beyond Conservative Cleanup, such as summarizing, formalizing, making concise, changing tone, or converting prose to bullet points. Style Actions are outside MVP cleanup.
_Avoid_: Cleanup mode, dictation cleanup

**Speech Artifact**:
A spoken-language or transcription issue that makes text harder to read, such as repeated accidental words, sentence-casing errors, clear agreement slips, clear transcription homophones, or obvious casing and spacing issues for well-known entities. Speech Artifacts can be fixed during Conservative Cleanup when the intended wording is clear from context, but repeated ideas are preserved.
_Avoid_: Style issue, rewrite opportunity

**Cleanup Uncertainty**:
A place where the cleanup process cannot confidently tell whether text should be changed or preserved. Cleanup Uncertainty should be exposed for user review rather than hidden.
_Avoid_: Low confidence edit, maybe issue

**Uncertainty Reason Category**:
A stable reason label used by Cleanup Evaluation Cases to judge why a Cleanup Uncertainty should be shown without depending on exact explanatory prose.
_Avoid_: Error code, free-form reason, confidence score

**Literal Phrase**:
Text the speaker intends to name, quote, label, or otherwise preserve as content even if it looks unusual. Literal Phrases should be preserved during Conservative Cleanup unless the intended normalization is clear from context.
_Avoid_: Quoted text, special text

**Cleanup Result**:
The structured outcome of cleanup, including the Raw Transcript, Cleaned Text, and any Cleanup Uncertainties needed for review or troubleshooting.
_Avoid_: Cleanup response, final text payload

**Cleanup Evaluation Case**:
A fixed Raw Transcript input with expected Cleaned Text and expected Cleanup Uncertainties used to judge Conservative Cleanup behavior without involving audio capture or transcription variability.
_Avoid_: Audio test, transcription benchmark, evaluation corpus

**Cleanup Evaluation Set**:
A small hand-curated collection of Cleanup Evaluation Cases that exercises the important Conservative Cleanup boundaries for the MVP.
_Avoid_: Benchmark suite, statistical corpus, audio corpus

**English-First Cleanup**:
The MVP language scope for Conservative Cleanup: cleanup behavior and acceptance criteria target English speech. Other languages may pass through, but multilingual cleanup quality is not part of the MVP promise.
_Avoid_: Multilingual cleanup, language-agnostic cleanup

**Plain Text Cleanup**:
The MVP output format for Cleaned Text: ordinary text with sentence punctuation and Paragraph Command breaks, but without generated Markdown formatting such as headings, bullets, bold text, or code spans.
_Avoid_: Markdown cleanup, rich text cleanup

**Disfluency Filler**:
A spoken pause or hesitation that does not carry the speaker's intended meaning, such as "um", "uh", or "like" when used only as a verbal pause. The same words are not Disfluency Fillers when they are meaningful content or quoted speech.
_Avoid_: Filler word, verbal junk

**Hedging Language**:
Words such as "probably", "maybe", "I think", and "kind of" that express the speaker's stance or uncertainty. Hedging Language is preserved unless it is clearly only a Disfluency Filler or accidental repetition.
_Avoid_: Weak wording, removable filler

**Paragraph Command**:
A simple standalone spoken instruction using the exact phrase "new paragraph" that marks where the speaker wants a paragraph break in the Cleaned Text. Paragraph breaks are created only from Paragraph Commands, not inferred from topic shifts, pauses, or other phrases such as "new line". If the phrase is clearly part of the intended content, it is not a Paragraph Command.
_Avoid_: Spoken edit, dictation command, editing command

**Unsupported Spoken Edit Command**:
A phrase that sounds like an editing instruction but is not part of MVP cleanup, such as "scratch that", "delete that", "replace X with Y", or "new line". Unsupported Spoken Edit Commands are preserved as content rather than executed.
_Avoid_: Paragraph Command, supported command, editing operation

**Punctuation Inference**:
The cleanup behavior that adds normal sentence punctuation from speech context without requiring spoken punctuation commands. Punctuation Inference includes periods, commas, question marks, and sparing exclamation marks when clearly implied.
_Avoid_: Punctuation command, spoken punctuation
