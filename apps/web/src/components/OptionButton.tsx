import type { Choice } from '../types/quiz'

export type OptionState = 'default' | 'correct' | 'incorrect'

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
  return (
    <button
      type="button"
      className={`option-button option-${state}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(choice.id)}
    >
      {shortcutLabel && (
        <span className="option-key" aria-hidden="true">
          {shortcutLabel}
        </span>
      )}
      <span>{choice.content}</span>
    </button>
  )
}
