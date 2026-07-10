import type {
  Attempt,
  MistakeRecord,
  PracticeAnswer,
  PracticeSession,
  PracticeSettings,
} from '../types/quiz'
import {
  defaultPracticeSettings,
  finalizeLocalData,
  isRecord,
  normalizeMistakeRecord,
  normalizePracticeAnswer,
  type QuizNestLocalData,
} from './storageSchema'

type LegacyMode =
  | 'practice'
  | 'sequential'
  | 'random'
  | 'difficulty-ascending'
  | 'mistake-review'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isLegacyMode(value: unknown): value is LegacyMode {
  return (
    value === 'practice' ||
    value === 'sequential' ||
    value === 'random' ||
    value === 'difficulty-ascending' ||
    value === 'mistake-review'
  )
}

function mapLegacyMode(mode: LegacyMode) {
  const source: PracticeSettings['source'] =
    mode === 'mistake-review' ? 'mistakes' : 'all'
  const order: PracticeSettings['order'] =
    mode === 'random'
      ? 'random'
      : mode === 'difficulty-ascending'
        ? 'difficulty-ascending'
        : 'sequential'

  return { source, order }
}

export function migratePracticeSettingsV1(
  value: unknown,
): PracticeSettings | undefined {
  if (!isRecord(value) || !isLegacyMode(value.mode)) {
    return undefined
  }

  const source: PracticeSettings['source'] =
    value.mode === 'mistake-review' || value.onlyMistakes === true
      ? 'mistakes'
      : value.onlyUnpracticed === true
        ? 'unpracticed'
        : 'all'

  return {
    source,
    order: mapLegacyMode(value.mode).order,
    chapter: typeof value.chapter === 'string' ? value.chapter : '',
    tag: typeof value.tag === 'string' ? value.tag : '',
  }
}

function migratePracticeSettingsRecord(
  value: unknown,
): Record<string, PracticeSettings> {
  if (!isRecord(value)) {
    return {}
  }

  const result: Record<string, PracticeSettings> = {}

  Object.entries(value).forEach(([bankId, settingsValue]) => {
    const settings = migratePracticeSettingsV1(settingsValue)
    if (bankId && settings) {
      result[bankId] = settings
    }
  })

  return result
}

function migrateAttemptV1(value: unknown): Attempt | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.bankId) ||
    !isNonEmptyString(value.questionId) ||
    !isLegacyMode(value.mode) ||
    !isStringArray(value.selectedChoiceIds) ||
    typeof value.isCorrect !== 'boolean' ||
    !isNonEmptyString(value.answeredAt) ||
    (value.durationMs !== undefined &&
      (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs)))
  ) {
    return undefined
  }

  const settings = mapLegacyMode(value.mode)

  return {
    id: value.id,
    sessionId: value.sessionId,
    bankId: value.bankId,
    questionId: value.questionId,
    source: settings.source,
    order: settings.order,
    selectedChoiceIds: value.selectedChoiceIds,
    isCorrect: value.isCorrect,
    answeredAt: value.answeredAt,
    durationMs:
      typeof value.durationMs === 'number' ? value.durationMs : undefined,
  }
}

function migrateSessionV1(
  value: unknown,
  practiceSettings: Record<string, PracticeSettings>,
): PracticeSession | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.bankId) ||
    !isLegacyMode(value.mode) ||
    !isStringArray(value.questionIds) ||
    typeof value.currentIndex !== 'number' ||
    !Number.isInteger(value.currentIndex) ||
    value.currentIndex < 0 ||
    !isNonEmptyString(value.startedAt) ||
    !isNonEmptyString(value.updatedAt)
  ) {
    return undefined
  }

  const questionIds = [...new Set(value.questionIds.filter(Boolean))]
  if (questionIds.length === 0) {
    return undefined
  }

  const bankSettings =
    practiceSettings[value.bankId] ?? defaultPracticeSettings
  const modeSettings = mapLegacyMode(value.mode)
  const settings: PracticeSettings = {
    source:
      value.mode === 'mistake-review' ? 'mistakes' : bankSettings.source,
    order: modeSettings.order,
    chapter: bankSettings.chapter,
    tag: bankSettings.tag,
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

  if (isNonEmptyString(value.finishedAt)) {
    return {
      ...baseSession,
      status: 'finished',
      finishedAt: value.finishedAt,
    }
  }

  return {
    ...baseSession,
    status: 'active',
  }
}

export function migrateV1ToV2(
  value: unknown,
): QuizNestLocalData | undefined {
  if (!isRecord(value) || value.version !== 1) {
    return undefined
  }

  const practiceSettings = migratePracticeSettingsRecord(
    value.practiceSettings,
  )
  const sessions = Array.isArray(value.sessions)
    ? value.sessions
        .map((session) => migrateSessionV1(session, practiceSettings))
        .filter(
          (session): session is PracticeSession => session !== undefined,
        )
    : []
  const sessionById = new Map(
    sessions.map((session) => [session.id, session]),
  )
  const attempts = Array.isArray(value.attempts)
    ? value.attempts
        .map(migrateAttemptV1)
        .filter((attempt): attempt is Attempt => attempt !== undefined)
        .map((attempt) => {
          const session = sessionById.get(attempt.sessionId)
          if (!session || session.bankId !== attempt.bankId) {
            return attempt
          }

          return {
            ...attempt,
            source: session.settings.source,
            order: session.settings.order,
          }
        })
    : []
  const mistakes = Array.isArray(value.mistakes)
    ? value.mistakes
        .map(normalizeMistakeRecord)
        .filter(
          (mistake): mistake is MistakeRecord => mistake !== undefined,
        )
    : []

  return finalizeLocalData({
    version: 2,
    attempts,
    mistakes,
    sessions,
    theme: value.theme === 'dark' ? 'dark' : 'light',
    answerSubmissionMode:
      value.answerSubmissionMode === 'immediate' ? 'immediate' : 'manual',
    practiceSettings,
  })
}
