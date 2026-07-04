import type { Choice } from '../types/quiz'

export interface OptionButtonProps {
  choice: Choice
  selected?: boolean
  onSelect?: (choiceId: string) => void
}

export function OptionButton({
  choice,
  selected = false,
  onSelect,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(choice.id)}
    >
      {choice.content}
    </button>
  )
}
