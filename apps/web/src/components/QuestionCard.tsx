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
    <article
      className="question-card"
      aria-labelledby="practice-question-title"
    >
      <div className="question-meta">
        <span>单项选择</span>
        {question.chapter && <span>{question.chapter}</span>}
        <span className={`difficulty difficulty-${difficulty}`}>
          {difficultyLabels[difficulty]}
        </span>
        {question.tags.length > 0 && (
          <span>知识点：{question.tags.join(' · ')}</span>
        )}
      </div>
      <h1 id="practice-question-title">{question.content}</h1>
    </article>
  )
}
