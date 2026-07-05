export type QuestionType = 'single-choice' | 'multiple-choice'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type PracticeMode =
  | 'sequential'
  | 'random'
  | 'difficulty-ascending'
  | 'mistake-review'

export type OrderStrategy = 'sequential' | 'random' | 'difficulty-ascending'

export type Theme = 'light' | 'dark'

export interface QuestionBank {
  id: string
  name: string
  description: string
  questionCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Choice {
  id: string
  content: string
}

export interface Question {
  id: string
  bankId: string
  type: QuestionType
  content: string
  choices: Choice[]
  answerChoiceIds: string[]
  explanation: string
  difficulty?: Difficulty
  chapter?: string
  module?: string
  tags: string[]
}

export interface Attempt {
  id: string
  sessionId: string
  bankId: string
  questionId: string
  mode: PracticeMode
  selectedChoiceIds: string[]
  isCorrect: boolean
  answeredAt: string
  durationMs?: number
}

export interface MistakeRecord {
  id: string
  bankId: string
  questionId: string
  latestAttemptId?: string
  mistakeCount: number
  lastMistakenAt: string
  nextReviewAt?: string
  masteredAt?: string
}

export interface PracticeAnswer {
  selectedChoiceId: string | null
  submitted: boolean
  isCorrect?: boolean
  answeredAt?: string
}

export interface PracticeSession {
  id: string
  bankId: string
  mode: PracticeMode
  questionIds: string[]
  answers: Record<string, PracticeAnswer>
  currentIndex: number
  totalCount: number
  answeredCount: number
  correctCount: number
  orderStrategy: OrderStrategy
  startedAt: string
  updatedAt: string
  finishedAt?: string
}

export interface PracticeSettings {
  mode: PracticeMode
  chapter: string
  tag: string
  onlyUnpracticed: boolean
  onlyMistakes: boolean
}

export interface BankStatistics {
  totalQuestions: number
  practicedQuestions: number
  mistakeCount: number
  masteredMistakeCount: number
  attemptCount: number
  correctRate: number
  latestPracticeAt?: string
}
