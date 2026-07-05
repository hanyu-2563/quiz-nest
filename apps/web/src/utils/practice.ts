import type {
  Attempt,
  BankStatistics,
  MistakeRecord,
  OrderStrategy,
  PracticeMode,
  PracticeSession,
  PracticeSettings,
  Question,
} from '../types/quiz'
import { getQuestionDifficulty } from './difficulty'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function shuffleQuestions(questions: Question[]) {
  const shuffled = [...questions]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[targetIndex]
    shuffled[targetIndex] = current
  }

  return shuffled
}

function getOrderStrategy(mode: PracticeMode): OrderStrategy {
  if (mode === 'random') {
    return 'random'
  }

  if (mode === 'difficulty-ascending') {
    return 'difficulty-ascending'
  }

  return 'sequential'
}

export function getPracticeQuestions(
  questions: Question[],
  settings: PracticeSettings,
  attempts: Attempt[],
  mistakes: MistakeRecord[],
) {
  const practicedQuestionIds = new Set(
    attempts.map((attempt) => attempt.questionId),
  )
  const activeMistakeIds = new Set(
    mistakes
      .filter((mistake) => !mistake.masteredAt)
      .map((mistake) => mistake.questionId),
  )

  let result = questions.filter((question) => {
    if (settings.chapter && question.chapter !== settings.chapter) {
      return false
    }

    if (settings.tag && !question.tags.includes(settings.tag)) {
      return false
    }

    if (
      settings.onlyUnpracticed &&
      practicedQuestionIds.has(question.id)
    ) {
      return false
    }

    if (
      (settings.onlyMistakes || settings.mode === 'mistake-review') &&
      !activeMistakeIds.has(question.id)
    ) {
      return false
    }

    return true
  })

  if (settings.mode === 'random') {
    result = shuffleQuestions(result)
  }

  if (settings.mode === 'difficulty-ascending') {
    const difficultyRank = { easy: 0, medium: 1, hard: 2 }
    result = [...result].sort((left, right) => {
      const leftIndex = questions.findIndex(
        (question) => question.id === left.id,
      )
      const rightIndex = questions.findIndex(
        (question) => question.id === right.id,
      )

      return (
        difficultyRank[
          getQuestionDifficulty(left, leftIndex, questions.length)
        ] -
        difficultyRank[
          getQuestionDifficulty(right, rightIndex, questions.length)
        ]
      )
    })
  }

  return result
}

export function createPracticeSession(
  bankId: string,
  questions: Question[],
  mode: PracticeMode,
): PracticeSession {
  const now = new Date().toISOString()

  return {
    id: createId('session'),
    bankId,
    mode,
    questionIds: questions.map((question) => question.id),
    answers: {},
    currentIndex: 0,
    totalCount: questions.length,
    answeredCount: 0,
    correctCount: 0,
    orderStrategy: getOrderStrategy(mode),
    startedAt: now,
    updatedAt: now,
  }
}

export function createAttempt(
  session: PracticeSession,
  questionId: string,
  selectedChoiceId: string,
  isCorrect: boolean,
): Attempt {
  return {
    id: createId('attempt'),
    sessionId: session.id,
    bankId: session.bankId,
    questionId,
    mode: session.mode,
    selectedChoiceIds: [selectedChoiceId],
    isCorrect,
    answeredAt: new Date().toISOString(),
  }
}

export function updateMistakes(
  mistakes: MistakeRecord[],
  attempt: Attempt,
) {
  if (attempt.isCorrect) {
    return mistakes
  }

  const existing = mistakes.find(
    (mistake) =>
      mistake.bankId === attempt.bankId &&
      mistake.questionId === attempt.questionId,
  )

  if (!existing) {
    return [
      ...mistakes,
      {
        id: createId('mistake'),
        bankId: attempt.bankId,
        questionId: attempt.questionId,
        latestAttemptId: attempt.id,
        mistakeCount: 1,
        lastMistakenAt: attempt.answeredAt,
      },
    ]
  }

  return mistakes.map((mistake) =>
    mistake.id === existing.id
      ? {
          ...mistake,
          latestAttemptId: attempt.id,
          mistakeCount: mistake.mistakeCount + 1,
          lastMistakenAt: attempt.answeredAt,
          masteredAt: undefined,
        }
      : mistake,
  )
}

export function getBankStatistics(
  bankId: string,
  totalQuestions: number,
  attempts: Attempt[],
  mistakes: MistakeRecord[],
): BankStatistics {
  const bankAttempts = attempts.filter(
    (attempt) => attempt.bankId === bankId,
  )
  const bankMistakes = mistakes.filter(
    (mistake) => mistake.bankId === bankId,
  )
  const practicedQuestions = new Set(
    bankAttempts.map((attempt) => attempt.questionId),
  ).size
  const correctAttempts = bankAttempts.filter(
    (attempt) => attempt.isCorrect,
  ).length
  const latestPracticeAt = [...bankAttempts]
    .sort((left, right) =>
      right.answeredAt.localeCompare(left.answeredAt),
    )
    .at(0)?.answeredAt

  return {
    totalQuestions,
    practicedQuestions,
    mistakeCount: bankMistakes.filter((mistake) => !mistake.masteredAt)
      .length,
    masteredMistakeCount: bankMistakes.filter(
      (mistake) => mistake.masteredAt,
    ).length,
    attemptCount: bankAttempts.length,
    correctRate:
      bankAttempts.length === 0
        ? 0
        : Math.round((correctAttempts / bankAttempts.length) * 100),
    latestPracticeAt,
  }
}
