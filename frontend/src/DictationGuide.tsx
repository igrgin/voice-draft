import { ChevronDown, CircleHelp } from "lucide-react";

export function DictationGuide() {
  return (
    <details className="dictation-guide">
      <summary>
        <CircleHelp aria-hidden="true" />
        <span>Dictation guide</span>
        <ChevronDown aria-hidden="true" className="guide-chevron" />
      </summary>
      <div className="guide-content">
        <p className="muted">Use these features with AI cleanup on.</p>

        <h2>New paragraph</h2>
        <p><strong>“new paragraph”</strong> starts a new paragraph. Say it as a standalone instruction.</p>
        <p className="guide-example-label">Try saying</p>
        <p>“First thought. New paragraph. Next thought.”</p>
        <div className="guide-example" aria-label="Example Cleaned Text">
          <p>First thought.</p>
          <p>Next thought.</p>
        </div>

        <h2>Speak naturally</h2>
        <p>Punctuation is inferred. Fillers like “um” and “uh” can be removed; meaningful words like “I think” stay.</p>
      </div>
    </details>
  );
}
