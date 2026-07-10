import { describe, expect, it } from 'vitest'
import {
  loadLocalData,
  removeLocalData,
  V1_STORAGE_KEY,
  V2_STORAGE_KEY,
} from './storage'
import { migrateV1ToV2 } from './storageMigration'
import {
  createDefaultLocalData,
  defaultPracticeSettings,
  normalizeLocalDataV2,
} from './storageSchema'

const startedAt = '2026-07-10T01:00:00.000Z'
const updatedAt = '2026-07-10T01:10:00.000Z'

class FakeStorage {
  private readonly values = new Map<string, string>()

  readonly getCalls: string[] = []
  readonly setCalls: Array<{ key: string; value: string }> = []
  readonly removeCalls: string[] = []

  constructor(initialValues: Record<string, string> = {}) {
    Object.entries(initialValues).forEach(([key, value]) => {
      this.values.set(key, value)
    })
  }

  getItem(key: string) {
    this.getCalls.push(key)
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.setCalls.push({ key, value })
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.removeCalls.push(key)
    this.values.delete(key)
  }

  peek(key: string) {
    return this.values.get(key) ?? null
  }
}

function makeV1Session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'legacy-session-1',
    bankId: 'bank-1',
    mode: 'sequential',
    questionIds: ['question-1', 'question-2'],
    answers: {},
    currentIndex: 0,
    totalCount: 999,
    answeredCount: 998,
    correctCount: 997,
    orderStrategy: 'random',
    startedAt,
    updatedAt,
    ...overrides,
  }
}

function makeV1Attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'legacy-attempt-1',
    sessionId: 'legacy-session-1',
    bankId: 'bank-1',
    questionId: 'question-1',
    mode: 'sequential',
    selectedChoiceIds: ['choice-a'],
    isCorrect: true,
    answeredAt: '2026-07-10T01:05:00.000Z',
    ...overrides,
  }
}

function makeV1Data(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    attempts: [],
    mistakes: [],
    sessions: [],
    theme: 'light',
    answerSubmissionMode: 'manual',
    practiceSettings: {},
    ...overrides,
  }
}

function requireMigrated(value: unknown) {
  const migrated = migrateV1ToV2(value)

  expect(migrated).toBeDefined()
  if (!migrated) {
    throw new Error('Expected v1 data to migrate')
  }

  return migrated
}

describe('v1 practice settings migration', () => {
  it.each([
    {
      name: 'sequential all',
      settings: {
        mode: 'sequential',
        chapter: '',
        tag: '',
        onlyUnpracticed: false,
        onlyMistakes: false,
      },
      expected: {
        source: 'all',
        order: 'sequential',
        chapter: '',
        tag: '',
      },
    },
    {
      name: 'random all',
      settings: {
        mode: 'random',
        chapter: 'chapter-1',
        tag: 'tag-a',
        onlyUnpracticed: false,
        onlyMistakes: false,
      },
      expected: {
        source: 'all',
        order: 'random',
        chapter: 'chapter-1',
        tag: 'tag-a',
      },
    },
    {
      name: 'difficulty-ascending unpracticed',
      settings: {
        mode: 'difficulty-ascending',
        chapter: '',
        tag: '',
        onlyUnpracticed: true,
        onlyMistakes: false,
      },
      expected: {
        source: 'unpracticed',
        order: 'difficulty-ascending',
        chapter: '',
        tag: '',
      },
    },
    {
      name: 'mistake review',
      settings: {
        mode: 'mistake-review',
        chapter: '',
        tag: '',
        onlyUnpracticed: false,
        onlyMistakes: false,
      },
      expected: {
        source: 'mistakes',
        order: 'sequential',
        chapter: '',
        tag: '',
      },
    },
  ])('maps $name into independent source and order', ({ settings, expected }) => {
    const migrated = requireMigrated(
      makeV1Data({
        practiceSettings: { 'bank-1': settings },
      }),
    )

    expect(migrated.practiceSettings['bank-1']).toEqual(expected)
  })

  it('gives mistakes priority when onlyMistakes and onlyUnpracticed conflict', () => {
    const migrated = requireMigrated(
      makeV1Data({
        practiceSettings: {
          'bank-1': {
            mode: 'random',
            chapter: '',
            tag: '',
            onlyUnpracticed: true,
            onlyMistakes: true,
          },
        },
      }),
    )

    expect(migrated.practiceSettings['bank-1']).toEqual({
      source: 'mistakes',
      order: 'random',
      chapter: '',
      tag: '',
    })
  })
})

describe('v1 session and attempt migration', () => {
  it('migrates a legacy unfinished session as active', () => {
    const migrated = requireMigrated(
      makeV1Data({ sessions: [makeV1Session()] }),
    )
    const session = migrated.sessions[0]

    expect(session).toMatchObject({
      id: 'legacy-session-1',
      status: 'active',
      settings: {
        source: 'all',
        order: 'sequential',
        chapter: '',
        tag: '',
      },
      questionIds: ['question-1', 'question-2'],
      answers: {},
    })
    expect(session).not.toHaveProperty('totalCount')
    expect(session).not.toHaveProperty('answeredCount')
    expect(session).not.toHaveProperty('correctCount')
    expect(session).not.toHaveProperty('orderStrategy')
  })

  it('migrates a legacy session with finishedAt as finished', () => {
    const finishedAt = '2026-07-10T02:00:00.000Z'
    const migrated = requireMigrated(
      makeV1Data({
        sessions: [makeV1Session({ finishedAt })],
      }),
    )

    expect(migrated.sessions[0]).toMatchObject({
      id: 'legacy-session-1',
      status: 'finished',
      finishedAt,
    })
  })

  it('migrates legacy attempt mode into source and order snapshots', () => {
    const migrated = requireMigrated(
      makeV1Data({
        sessions: [makeV1Session({ mode: 'random' })],
        attempts: [makeV1Attempt({ mode: 'random' })],
      }),
    )

    expect(migrated.attempts[0]).toMatchObject({
      id: 'legacy-attempt-1',
      source: 'all',
      order: 'random',
    })
    expect(migrated.attempts[0]).not.toHaveProperty('mode')
  })

  it('reconstructs a finished session for orphan attempts', () => {
    const firstAnsweredAt = '2026-07-10T01:05:00.000Z'
    const lastAnsweredAt = '2026-07-10T01:06:00.000Z'
    const migrated = requireMigrated(
      makeV1Data({
        attempts: [
          makeV1Attempt({
            id: 'attempt-1',
            sessionId: 'deleted-session',
            questionId: 'question-1',
            answeredAt: firstAnsweredAt,
          }),
          makeV1Attempt({
            id: 'attempt-2',
            sessionId: 'deleted-session',
            questionId: 'question-2',
            selectedChoiceIds: ['choice-b'],
            isCorrect: false,
            answeredAt: lastAnsweredAt,
          }),
        ],
      }),
    )
    const session = migrated.sessions.find(
      (item) => item.id === 'deleted-session',
    )

    expect(session).toMatchObject({
      id: 'deleted-session',
      bankId: 'bank-1',
      status: 'finished',
      questionIds: ['question-1', 'question-2'],
      startedAt: firstAnsweredAt,
      updatedAt: lastAnsweredAt,
      finishedAt: lastAnsweredAt,
      settings: {
        source: 'all',
        order: 'sequential',
        chapter: '',
        tag: '',
      },
    })
    expect(session?.answers).toMatchObject({
      'question-1': {
        selectedChoiceId: 'choice-a',
        submitted: true,
        isCorrect: true,
        answeredAt: firstAnsweredAt,
      },
      'question-2': {
        selectedChoiceId: 'choice-b',
        submitted: true,
        isCorrect: false,
        answeredAt: lastAnsweredAt,
      },
    })
    expect(
      migrated.attempts.every((attempt) =>
        migrated.sessions.some(
          (candidate) => candidate.id === attempt.sessionId,
        ),
      ),
    ).toBe(true)
  })

  it('drops only the conflicting attempt when one legacy sessionId spans banks', () => {
    const migrated = requireMigrated(
      makeV1Data({
        attempts: [
          makeV1Attempt({ sessionId: 'shared-session' }),
          makeV1Attempt({
            id: 'cross-bank-attempt',
            sessionId: 'shared-session',
            bankId: 'bank-2',
            questionId: 'question-2',
          }),
        ],
      }),
    )

    expect(migrated.attempts.map((attempt) => attempt.id)).toEqual([
      'legacy-attempt-1',
    ])
    expect(
      migrated.sessions.find((session) => session.id === 'shared-session'),
    ).toMatchObject({ bankId: 'bank-1', status: 'finished' })
  })

  it('normalizes duplicate active sessions to at most one per bank', () => {
    const migrated = requireMigrated(
      makeV1Data({
        sessions: [
          makeV1Session({
            id: 'older-session',
            updatedAt: '2026-07-10T01:05:00.000Z',
          }),
          makeV1Session({
            id: 'newer-session',
            updatedAt: '2026-07-10T01:10:00.000Z',
          }),
        ],
      }),
    )
    const bankSessions = migrated.sessions.filter(
      (session) => session.bankId === 'bank-1',
    )

    expect(
      bankSessions.filter((session) => session.status === 'active'),
    ).toHaveLength(1)
    expect(
      bankSessions.find((session) => session.id === 'newer-session')
        ?.status,
    ).toBe('active')
    expect(
      bankSessions.find((session) => session.id === 'older-session')
        ?.status,
    ).toBe('abandoned')
  })

  it('keeps valid records when individual v1 records are invalid', () => {
    const migrated = requireMigrated(
      makeV1Data({
        sessions: [makeV1Session(), { id: 42 }],
        attempts: [makeV1Attempt(), { id: 42 }],
        mistakes: [
          {
            id: 'mistake-1',
            bankId: 'bank-1',
            questionId: 'question-1',
            mistakeCount: 1,
            lastMistakenAt: updatedAt,
          },
          { id: 42 },
        ],
        practiceSettings: {
          'bank-1': {
            mode: 'sequential',
            chapter: '',
            tag: '',
            onlyUnpracticed: false,
            onlyMistakes: false,
          },
          broken: { mode: 42 },
        },
      }),
    )

    expect(migrated.sessions).toHaveLength(1)
    expect(migrated.attempts).toHaveLength(1)
    expect(migrated.mistakes).toHaveLength(1)
    expect(migrated.practiceSettings).toEqual({
      'bank-1': defaultPracticeSettings,
    })
  })
})

describe('v2 normalization and storage loading', () => {
  it('keeps valid v2 records when neighboring records are invalid', () => {
    const rawData = {
      ...createDefaultLocalData(),
      sessions: [
        {
          id: 'session-1',
          bankId: 'bank-1',
          settings: defaultPracticeSettings,
          status: 'finished',
          questionIds: ['question-1'],
          answers: {
            'question-1': {
              selectedChoiceId: 'choice-a',
              submitted: true,
              isCorrect: true,
              answeredAt: updatedAt,
            },
          },
          currentIndex: 0,
          startedAt,
          updatedAt,
          finishedAt: updatedAt,
        },
        { id: 42 },
      ],
      attempts: [
        {
          id: 'attempt-1',
          sessionId: 'session-1',
          bankId: 'bank-1',
          questionId: 'question-1',
          source: 'all',
          order: 'sequential',
          selectedChoiceIds: ['choice-a'],
          isCorrect: true,
          answeredAt: updatedAt,
        },
        { id: 42 },
      ],
      mistakes: [
        {
          id: 'mistake-1',
          bankId: 'bank-1',
          questionId: 'question-1',
          mistakeCount: 1,
          lastMistakenAt: updatedAt,
        },
        { id: 42 },
      ],
      practiceSettings: {
        'bank-1': defaultPracticeSettings,
        broken: { source: 'invalid' },
      },
    }

    const normalized = normalizeLocalDataV2(rawData)

    expect(normalized).toBeDefined()
    expect(normalized?.sessions).toHaveLength(1)
    expect(normalized?.attempts).toHaveLength(1)
    expect(normalized?.mistakes).toHaveLength(1)
    expect(normalized?.practiceSettings).toEqual({
      'bank-1': defaultPracticeSettings,
    })
  })

  it('loads v2 without reading or migrating v1 again', () => {
    const v2Data = { ...createDefaultLocalData(), theme: 'dark' as const }
    const storage = new FakeStorage({
      [V2_STORAGE_KEY]: JSON.stringify(v2Data),
      [V1_STORAGE_KEY]: JSON.stringify(
        makeV1Data({ theme: 'light' }),
      ),
    })

    const loaded = loadLocalData(storage)

    expect(loaded.theme).toBe('dark')
    expect(storage.getCalls).toEqual([V2_STORAGE_KEY])
    expect(storage.setCalls).toEqual([])
  })

  it('falls back to v1, writes v2 once, and preserves the v1 key', () => {
    const rawV1 = JSON.stringify(
      makeV1Data({
        attempts: [
          makeV1Attempt({ sessionId: 'deleted-session' }),
        ],
      }),
    )
    const storage = new FakeStorage({ [V1_STORAGE_KEY]: rawV1 })

    const firstLoad = loadLocalData(storage)
    const secondLoad = loadLocalData(storage)

    expect(firstLoad.version).toBe(2)
    expect(secondLoad).toEqual(firstLoad)
    expect(storage.getCalls).toEqual([
      V2_STORAGE_KEY,
      V1_STORAGE_KEY,
      V2_STORAGE_KEY,
    ])
    expect(storage.setCalls).toHaveLength(1)
    expect(storage.setCalls[0].key).toBe(V2_STORAGE_KEY)
    expect(storage.peek(V1_STORAGE_KEY)).toBe(rawV1)
  })

  it('does not destroy v1 data or write v2 when migration cannot parse it', () => {
    const invalidV1 = '{not valid json'
    const storage = new FakeStorage({ [V1_STORAGE_KEY]: invalidV1 })

    const loaded = loadLocalData(storage)

    expect(loaded).toEqual(createDefaultLocalData())
    expect(storage.peek(V1_STORAGE_KEY)).toBe(invalidV1)
    expect(storage.peek(V2_STORAGE_KEY)).toBeNull()
    expect(storage.removeCalls).toEqual([])
  })

  it('tries both storage keys and reports a partial clear failure', () => {
    const removeCalls: string[] = []
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem(key: string) {
        removeCalls.push(key)
        if (key === V2_STORAGE_KEY) {
          throw new Error('v2 remove failed')
        }
      },
    }

    expect(removeLocalData(storage)).toBe(false)
    expect(removeCalls).toEqual([V2_STORAGE_KEY, V1_STORAGE_KEY])
  })
})
