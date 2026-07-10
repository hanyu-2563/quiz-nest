import type {
  AnswerSubmissionMode,
  Attempt,
  MistakeRecord,
  PracticeAnswer,
  PracticeSession,
  PracticeSettings,
  Theme,
} from '../types/quiz'

export interface QuizNestLocalData {
  version: 2
  attempts: Attempt[]
  mistakes: MistakeRecord[]
  sessions: PracticeSession[]
  theme: Theme
  answerSubmissionMode: AnswerSubmissionMode
  practiceSettings: Record<string, PracticeSettings>
}

export const defaultPracticeSettings: PracticeSettings = {
  source: 'all',
  order: 'sequential',
  chapter: '',
  tag: '',
}

type UnknownRecord = Record<string, unknown>

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

export function isPracticeSource(
  value: unknown,
): value is PracticeSettings['source'] {
  return value === 'all' || value === 'unpracticed' || value === 'mistakes'
}

export function isPracticeOrder(
  value: unknown,
): value is PracticeSettings['order'] {
  return (
    value === 'sequential' ||
    value === 'random' ||
    value === 'difficulty-ascending'
  )
}

function isSessionStatus(
  value: unknown,
): value is PracticeSession['status'] {
  return value === 'active' || value === 'finished' || value === 'abandoned'
}

export function normalizePracticeAnswer(
  value: unknown,
): PracticeAnswer | undefined {
  if (
    !isRecord(value) ||
    (value.selectedChoiceId !== null &&
      typeof value.selectedChoiceId !== 'string') ||
    typeof value.submitted !== 'boolean'
  ) {
    return undefined
  }

  if (!value.submitted) {
    if (value.isCorrect !== undefined || value.answeredAt !== undefined) {
      return undefined
    }

    return {
      selectedChoiceId: value.selectedChoiceId,
      submitted: false,
    }
  }

  if (
    typeof value.selectedChoiceId !== 'string' ||
    typeof value.isCorrect !== 'boolean' ||
    typeof value.answeredAt !== 'string'
  ) {
    return undefined
  }

  return {
    selectedChoiceId: value.selectedChoiceId,
    submitted: true,
    isCorrect: value.isCorrect,
    answeredAt: value.answeredAt,
  }
}

export function normalizeAttemptV2(value: unknown): Attempt | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.bankId) ||
    !isNonEmptyString(value.questionId) ||
    !isPracticeSource(value.source) ||
    !isPracticeOrder(value.order) ||
    !isStringArray(value.selectedChoiceIds) ||
    typeof value.isCorrect !== 'boolean' ||
    !isNonEmptyString(value.answeredAt) ||
    (value.durationMs !== undefined &&
      (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs)))
  ) {
    return undefined
  }

  return {
    id: value.id,
    sessionId: value.sessionId,
    bankId: value.bankId,
    questionId: value.questionId,
    source: value.source,
    order: value.order,
    selectedChoiceIds: value.selectedChoiceIds,
    isCorrect: value.isCorrect,
    answeredAt: value.answeredAt,
    durationMs:
      typeof value.durationMs === 'number' ? value.durationMs : undefined,
  }
}

export function normalizeMistakeRecord(
  value: unknown,
): MistakeRecord | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.bankId) ||
    !isNonEmptyString(value.questionId) ||
    !isOptionalString(value.latestAttemptId) ||
    typeof value.mistakeCount !== 'number' ||
    !Number.isInteger(value.mistakeCount) ||
    value.mistakeCount <= 0 ||
    !isNonEmptyString(value.lastMistakenAt) ||
    !isOptionalString(value.nextReviewAt) ||
    !isOptionalString(value.masteredAt)
  ) {
    return undefined
  }

  return {
    id: value.id,
    bankId: value.bankId,
    questionId: value.questionId,
    latestAttemptId:
      typeof value.latestAttemptId === 'string'
        ? value.latestAttemptId
        : undefined,
    mistakeCount: value.mistakeCount,
    lastMistakenAt: value.lastMistakenAt,
    nextReviewAt:
      typeof value.nextReviewAt === 'string' ? value.nextReviewAt : undefined,
    masteredAt:
      typeof value.masteredAt === 'string' ? value.masteredAt : undefined,
  }
}

export function normalizePracticeSettingsV2(
  value: unknown,
): PracticeSettings | undefined {
  if (
    !isRecord(value) ||
    !isPracticeSource(value.source) ||
    !isPracticeOrder(value.order) ||
    typeof value.chapter !== 'string' ||
    typeof value.tag !== 'string'
  ) {
    return undefined
  }

  return {
    source: value.source,
    order: value.order,
    chapter: value.chapter,
    tag: value.tag,
  }
}

function normalizeSessionV2(value: unknown): PracticeSession | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.bankId) ||
    !isSessionStatus(value.status) ||
    !isStringArray(value.questionIds) ||
    typeof value.currentIndex !== 'number' ||
    !Number.isInteger(value.currentIndex) ||
    value.currentIndex < 0 ||
    !isNonEmptyString(value.startedAt) ||
    !isNonEmptyString(value.updatedAt)
  ) {
    return undefined
  }

  const settings = normalizePracticeSettingsV2(value.settings)
  const questionIds = [...new Set(value.questionIds.filter(Boolean))]

  if (!settings || questionIds.length === 0) {
    return undefined
  }

  const answers: Record<string, PracticeAnswer> = {}

  if (isRecord(value.answers)) {
    Object.entries(value.answers).forEach(([questionId, answerValue]) => {
      if (!questionIds.includes(questionId)) {
        return
      }

      const answer = normalizePracticeAnswer(answerValue)
      if (answer) {
        answers[questionId] = answer
      }
    })
  }

  const baseSession = {
    id: value.id,
    bankId: value.bankId,
    settings,
    questionIds,
    answers,
    currentIndex: Math.min(value.currentIndex, questionIds.length - 1),
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
  }

  if (value.status === 'finished') {
    if (!isNonEmptyString(value.finishedAt)) {
      return undefined
    }

    return {
      ...baseSession,
      status: 'finished',
      finishedAt: value.finishedAt,
    }
  }

  if (value.status === 'abandoned') {
    return {
      ...baseSession,
      status: 'abandoned',
      abandonedAt: isNonEmptyString(value.abandonedAt)
        ? value.abandonedAt
        : value.updatedAt,
    }
  }

  return {
    ...baseSession,
    status: 'active',
  }
}

function normalizePracticeSettingsRecord(
  value: unknown,
): Record<string, PracticeSettings> {
  if (!isRecord(value)) {
    return {}
  }

  const result: Record<string, PracticeSettings> = {}

  Object.entries(value).forEach(([bankId, settingsValue]) => {
    const settings = normalizePracticeSettingsV2(settingsValue)
    if (bankId && settings) {
      result[bankId] = settings
    }
  })

  return result
}

function deduplicateAttempts(attempts: Attempt[]) {
  const byId = new Map<string, Attempt>()

  attempts.forEach((attempt) => {
    const existing = byId.get(attempt.id)
    if (!existing || attempt.answeredAt >= existing.answeredAt) {
      byId.set(attempt.id, attempt)
    }
  })

  return [...byId.values()]
}

function deduplicateSessions(sessions: PracticeSession[]) {
  const byId = new Map<string, PracticeSession>()

  sessions.forEach((session) => {
    const existing = byId.get(session.id)
    if (!existing || session.updatedAt >= existing.updatedAt) {
      byId.set(session.id, session)
    }
  })

  return [...byId.values()]
}

function createRecoveredSession(attempts: Attempt[]): PracticeSession {
  const orderedAttempts = [...attempts].sort((left, right) =>
    left.answeredAt.localeCompare(right.answeredAt),
  )
  const firstAttempt = orderedAttempts[0]
  const lastAttempt = orderedAttempts[orderedAttempts.length - 1]
  const questionIds = [
    ...new Set(orderedAttempts.map((attempt) => attempt.questionId)),
  ]
  const answers: Record<string, PracticeAnswer> = {}

  orderedAttempts.forEach((attempt) => {
    const selectedChoiceId = attempt.selectedChoiceIds[0]
    if (selectedChoiceId === undefined) {
      return
    }

    answers[attempt.questionId] = {
      selectedChoiceId,
      submitted: true,
      isCorrect: attempt.isCorrect,
      answeredAt: attempt.answeredAt,
    }
  })

  return {
    id: firstAttempt.sessionId,
    bankId: firstAttempt.bankId,
    settings: {
      source: firstAttempt.source,
      order: firstAttempt.order,
      chapter: '',
      tag: '',
    },
    status: 'finished',
    questionIds,
    answers,
    currentIndex: questionIds.length - 1,
    startedAt: firstAttempt.answeredAt,
    updatedAt: lastAttempt.answeredAt,
    finishedAt: lastAttempt.answeredAt,
  }
}

export function ensureSingleActiveSessionPerBank(
  sessions: PracticeSession[],
) {
  const winnerIndexByBank = new Map<string, number>()

  sessions.forEach((session, index) => {
    if (session.status !== 'active') {
      return
    }

    const winnerIndex = winnerIndexByBank.get(session.bankId)
    if (
      winnerIndex === undefined ||
      session.updatedAt >= sessions[winnerIndex].updatedAt
    ) {
      winnerIndexByBank.set(session.bankId, index)
    }
  })

  return sessions.map((session, index) => {
    if (
      session.status !== 'active' ||
      winnerIndexByBank.get(session.bankId) === index
    ) {
      return session
    }

    return {
      ...session,
      status: 'abandoned' as const,
      finishedAt: undefined,
      abandonedAt: session.updatedAt,
    }
  })
}

function reconcileAttemptSessions(
  attempts: Attempt[],
  sessions: PracticeSession[],
) {
  const sessionById = new Map(
    sessions.map((session) => [session.id, session]),
  )
  const orphanBankBySessionId = new Map<string, string>()

  const validAttempts = attempts.filter((attempt) => {
    const session = sessionById.get(attempt.sessionId)
    if (session) {
      return session.bankId === attempt.bankId
    }

    const orphanBankId = orphanBankBySessionId.get(attempt.sessionId)
    if (orphanBankId === undefined) {
      orphanBankBySessionId.set(attempt.sessionId, attempt.bankId)
      return true
    }

    return orphanBankId === attempt.bankId
  })

  const orphanAttempts = new Map<string, Attempt[]>()

  validAttempts.forEach((attempt) => {
    if (sessionById.has(attempt.sessionId)) {
      return
    }

    const group = orphanAttempts.get(attempt.sessionId) ?? []
    group.push(attempt)
    orphanAttempts.set(attempt.sessionId, group)
  })

  const recoveredSessions = [...orphanAttempts.values()].map(
    createRecoveredSession,
  )

  return {
    attempts: validAttempts,
    sessions: [...sessions, ...recoveredSessions],
  }
}

export function finalizeLocalData(data: QuizNestLocalData): QuizNestLocalData {
  const attempts = deduplicateAttempts(data.attempts)
  const sessions = deduplicateSessions(data.sessions)
  const reconciled = reconcileAttemptSessions(attempts, sessions)
  const attemptIds = new Set(reconciled.attempts.map((attempt) => attempt.id))
  const mistakes = data.mistakes.map((mistake) =>
    mistake.latestAttemptId && !attemptIds.has(mistake.latestAttemptId)
      ? { ...mistake, latestAttemptId: undefined }
      : mistake,
  )

  return {
    ...data,
    version: 2,
    attempts: reconciled.attempts,
    mistakes,
    sessions: ensureSingleActiveSessionPerBank(reconciled.sessions),
  }
}

export function createDefaultLocalData(): QuizNestLocalData {
  return {
    version: 2,
    attempts: [],
    mistakes: [],
    sessions: [],
    theme: 'light',
    answerSubmissionMode: 'manual',
    practiceSettings: {},
  }
}

export function normalizeLocalDataV2(
  value: unknown,
): QuizNestLocalData | undefined {
  if (!isRecord(value) || value.version !== 2) {
    return undefined
  }

  const data: QuizNestLocalData = {
    version: 2,
    attempts: Array.isArray(value.attempts)
      ? value.attempts
          .map(normalizeAttemptV2)
          .filter((attempt): attempt is Attempt => attempt !== undefined)
      : [],
    mistakes: Array.isArray(value.mistakes)
      ? value.mistakes
          .map(normalizeMistakeRecord)
          .filter(
            (mistake): mistake is MistakeRecord => mistake !== undefined,
          )
      : [],
    sessions: Array.isArray(value.sessions)
      ? value.sessions
          .map(normalizeSessionV2)
          .filter(
            (session): session is PracticeSession => session !== undefined,
          )
      : [],
    theme: value.theme === 'dark' ? 'dark' : 'light',
    answerSubmissionMode:
      value.answerSubmissionMode === 'immediate' ? 'immediate' : 'manual',
    practiceSettings: normalizePracticeSettingsRecord(value.practiceSettings),
  }

  return finalizeLocalData(data)
}
