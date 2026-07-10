export type QuestionType = 'single-choice' | 'multiple-choice'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type PracticeSource = 'all' | 'unpracticed' | 'mistakes'

export type PracticeOrder =
  | 'sequential'
  | 'random'
  | 'difficulty-ascending'

export type PracticeSessionStatus = 'active' | 'finished' | 'abandoned'

export type Theme = 'light' | 'dark'

export type AnswerSubmissionMode = 'immediate' | 'manual'

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
  source: PracticeSource
  order: PracticeOrder
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
  settings: PracticeSettings
  status: PracticeSessionStatus
  questionIds: string[]
  answers: Record<string, PracticeAnswer>
  currentIndex: number
  startedAt: string
  updatedAt: string
  finishedAt?: string
  abandonedAt?: string
}

export interface PracticeSettings {
  source: PracticeSource
  order: PracticeOrder
  chapter: string
  tag: string
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
