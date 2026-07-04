import type { Difficulty, Question } from '../types/quiz'

export function getQuestionDifficulty(
  question: Question,
  index: number,
  total: number,
): Difficulty {
  if (question.difficulty) {
    return question.difficulty
  }

  if (
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    index < 0 ||
    index >= total
  ) {
    return 'medium'
  }

  const position = index / total

  if (position < 1 / 3) {
    return 'easy'
  }

  if (position < 2 / 3) {
    return 'medium'
  }

  return 'hard'
}
