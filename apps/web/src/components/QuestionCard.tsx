import type { Question } from '../types/quiz'

export interface QuestionCardProps {
  question: Question
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <article>
      <p>{question.content}</p>
    </article>
  )
}
