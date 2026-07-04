import type { Difficulty, Question } from '../types/quiz'

const difficultyLabels: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export interface QuestionCardProps {
  question: Question
  difficulty: Difficulty
  position: number
  total: number
}

export function QuestionCard({
  question,
  difficulty,
  position,
  total,
}: QuestionCardProps) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span>
          第 {position} / {total} 题
        </span>
        <span>{question.chapter}</span>
        <span className={`difficulty difficulty-${difficulty}`}>
          {difficultyLabels[difficulty]}
        </span>
      </div>
      <h2>{question.content}</h2>
    </article>
  )
}
