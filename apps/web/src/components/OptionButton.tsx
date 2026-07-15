import type { Choice } from '../types/quiz'

export type OptionState =
  | 'default'
  | 'correct'
  | 'incorrect'
  | 'dimmed'

export interface OptionButtonProps {
  choice: Choice
  shortcutLabel?: string
  selected?: boolean
  disabled?: boolean
  state?: OptionState
  onSelect?: (choiceId: string) => void
}

export function OptionButton({
  choice,
  shortcutLabel,
  selected = false,
  disabled = false,
  state = 'default',
  onSelect,
}: OptionButtonProps) {
  const stateDescription =
    state === 'correct'
      ? '正确答案'
      : state === 'incorrect'
        ? '你的答案，回答错误'
        : undefined

  return (
    <button
      type="button"
      className={`option-button option-${state}`}
      aria-label={[
        shortcutLabel ? `选项 ${shortcutLabel}` : undefined,
        choice.content,
        stateDescription,
      ]
        .filter(Boolean)
        .join('，')}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(choice.id)}
    >
      {shortcutLabel && (
        <span className="option-key" aria-hidden="true">
          {shortcutLabel}
        </span>
      )}
      <span className="option-content">{choice.content}</span>
      {state === 'correct' && (
        <span className="option-result" aria-hidden="true">
          ✓
        </span>
      )}
      {state === 'incorrect' && (
        <span className="option-result" aria-hidden="true">
          ×
        </span>
      )}
    </button>
  )
}
