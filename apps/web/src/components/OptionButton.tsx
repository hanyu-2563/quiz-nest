import type { Choice } from '../types/quiz'

export type OptionState = 'default' | 'correct' | 'incorrect'

export interface OptionButtonProps {
  choice: Choice
  selected?: boolean
  disabled?: boolean
  state?: OptionState
  onSelect?: (choiceId: string) => void
}

export function OptionButton({
  choice,
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
      {choice.content}
    </button>
  )
}
