import type { Difficulty, Question } from '../types/quiz'

const difficultyLabels: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export interface QuestionCardProps {
  question: Question
  difficulty: Difficulty
}

export function QuestionCard({
  question,
  difficulty,
}: QuestionCardProps) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span>{question.chapter}</span>
        <span className={`difficulty difficulty-${difficulty}`}>
          {difficultyLabels[difficulty]}
        </span>
      </div>
      <h2>{question.content}</h2>
    </article>
  )
}
