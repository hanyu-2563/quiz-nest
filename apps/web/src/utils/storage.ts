import type {
  Attempt,
  MistakeRecord,
  PracticeSession,
  PracticeSettings,
  Theme,
} from '../types/quiz'

export const QUIZNEST_STORAGE_KEY = 'quiznest.local-data.v1'

export interface QuizNestLocalData {
  version: 1
  attempts: Attempt[]
  mistakes: MistakeRecord[]
  sessions: PracticeSession[]
  theme: Theme
  practiceSettings: Record<string, PracticeSettings>
}

export const defaultPracticeSettings: PracticeSettings = {
  mode: 'sequential',
  chapter: '',
  tag: '',
  onlyUnpracticed: false,
  onlyMistakes: false,
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  )
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function isPracticeMode(value: unknown): value is PracticeSession['mode'] {
  return (
    value === 'sequential' ||
    value === 'random' ||
    value === 'difficulty-ascending' ||
    value === 'mistake-review'
  )
}

function isOrderStrategy(
  value: unknown,
): value is PracticeSession['orderStrategy'] {
  return (
    value === 'sequential' ||
    value === 'random' ||
    value === 'difficulty-ascending'
  )
}

function isAttempt(value: unknown): value is Attempt {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.bankId === 'string' &&
    typeof value.questionId === 'string' &&
    isPracticeMode(value.mode) &&
    isStringArray(value.selectedChoiceIds) &&
    typeof value.isCorrect === 'boolean' &&
    typeof value.answeredAt === 'string' &&
    (value.durationMs === undefined ||
      typeof value.durationMs === 'number')
  )
}

function isMistakeRecord(value: unknown): value is MistakeRecord {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.bankId === 'string' &&
    typeof value.questionId === 'string' &&
    isOptionalString(value.latestAttemptId) &&
    typeof value.mistakeCount === 'number' &&
    Number.isInteger(value.mistakeCount) &&
    value.mistakeCount > 0 &&
    typeof value.lastMistakenAt === 'string' &&
    isOptionalString(value.nextReviewAt) &&
    isOptionalString(value.masteredAt)
  )
}

function isPracticeAnswer(
  value: unknown,
): value is PracticeSession['answers'][string] {
  if (
    !isRecord(value) ||
    (value.selectedChoiceId !== null &&
      typeof value.selectedChoiceId !== 'string') ||
    typeof value.submitted !== 'boolean'
  ) {
    return false
  }

  if (!value.submitted) {
    return value.isCorrect === undefined && value.answeredAt === undefined
  }

  return (
    typeof value.selectedChoiceId === 'string' &&
    typeof value.isCorrect === 'boolean' &&
    typeof value.answeredAt === 'string'
  )
}

function normalizeSession(value: unknown): PracticeSession | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.bankId !== 'string' ||
    !isStringArray(value.questionIds) ||
    value.questionIds.length === 0 ||
    typeof value.currentIndex !== 'number' ||
    !Number.isInteger(value.currentIndex) ||
    value.currentIndex < 0 ||
    typeof value.startedAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !isOptionalString(value.finishedAt)
  ) {
    return undefined
  }

  const mode =
    value.mode === 'practice'
      ? 'sequential'
      : isPracticeMode(value.mode)
        ? value.mode
        : undefined
  const orderStrategy = isOrderStrategy(value.orderStrategy)
    ? value.orderStrategy
    : mode === 'random'
      ? 'random'
      : mode === 'difficulty-ascending'
        ? 'difficulty-ascending'
        : 'sequential'

  if (!mode) {
    return undefined
  }

  const questionIds = value.questionIds
  const answers: PracticeSession['answers'] = {}

  if (isRecord(value.answers)) {
    Object.entries(value.answers).forEach(([questionId, answer]) => {
      if (
        questionIds.includes(questionId) &&
        isPracticeAnswer(answer)
      ) {
        answers[questionId] = answer
      }
    })
  }

  const submittedAnswers = Object.values(answers).filter(
    (answer) => answer.submitted,
  )

  return {
    id: value.id,
    bankId: value.bankId,
    mode,
    questionIds,
    answers,
    currentIndex: Math.min(
      value.currentIndex,
      questionIds.length - 1,
    ),
    totalCount: questionIds.length,
    answeredCount: submittedAnswers.length,
    correctCount: submittedAnswers.filter((answer) => answer.isCorrect)
      .length,
    orderStrategy,
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
    finishedAt:
      typeof value.finishedAt === 'string'
        ? value.finishedAt
        : undefined,
  }
}

function isPracticeSettings(value: unknown): value is PracticeSettings {
  return (
    isRecord(value) &&
    isPracticeMode(value.mode) &&
    typeof value.chapter === 'string' &&
    typeof value.tag === 'string' &&
    typeof value.onlyUnpracticed === 'boolean' &&
    typeof value.onlyMistakes === 'boolean'
  )
}

function normalizePracticeSettings(
  value: unknown,
): Record<string, PracticeSettings> {
  if (!isRecord(value)) {
    return {}
  }

  const settings: Record<string, PracticeSettings> = {}

  Object.entries(value).forEach(([bankId, bankSettings]) => {
    if (isPracticeSettings(bankSettings)) {
      settings[bankId] = bankSettings
    }
  })

  return settings
}

export function createDefaultLocalData(): QuizNestLocalData {
  return {
    version: 1,
    attempts: [],
    mistakes: [],
    sessions: [],
    theme: 'light',
    practiceSettings: {},
  }
}

export function loadLocalData(): QuizNestLocalData {
  try {
    const rawData = localStorage.getItem(QUIZNEST_STORAGE_KEY)

    if (!rawData) {
      return createDefaultLocalData()
    }

    const parsed: unknown = JSON.parse(rawData)

    if (!isRecord(parsed) || parsed.version !== 1) {
      return createDefaultLocalData()
    }

    return {
      version: 1,
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.filter(isAttempt)
        : [],
      mistakes: Array.isArray(parsed.mistakes)
        ? parsed.mistakes.filter(isMistakeRecord)
        : [],
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map(normalizeSession)
            .filter(
              (session): session is PracticeSession =>
                session !== undefined,
            )
        : [],
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      practiceSettings: normalizePracticeSettings(
        parsed.practiceSettings,
      ),
    }
  } catch {
    return createDefaultLocalData()
  }
}

export function saveLocalData(data: QuizNestLocalData) {
  localStorage.setItem(QUIZNEST_STORAGE_KEY, JSON.stringify(data))
}

export function removeLocalData() {
  localStorage.removeItem(QUIZNEST_STORAGE_KEY)
}
