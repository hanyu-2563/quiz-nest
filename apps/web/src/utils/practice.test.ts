import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  Attempt,
  MistakeRecord,
  PracticeSession,
  PracticeSettings,
  Question,
} from '../types/quiz'
import {
  abandonPracticeSession,
  createAttempt,
  createPracticeSession,
  finishPracticeSession,
  getActivePracticeSession,
  getPracticeQuestions,
  getPracticeSessionProgress,
  startPracticeSession,
} from './practice'

const baseSettings: PracticeSettings = {
  source: 'all',
  order: 'sequential',
  chapter: '',
  tag: '',
}

const questions: Question[] = [
  {
    id: 'question-1',
    bankId: 'bank-1',
    type: 'single-choice',
    content: 'Question 1',
    choices: [
      { id: 'q1-a', content: 'A' },
      { id: 'q1-b', content: 'B' },
    ],
    answerChoiceIds: ['q1-a'],
    explanation: 'Explanation 1',
    difficulty: 'medium',
    chapter: 'chapter-1',
    tags: ['tag-a'],
  },
  {
    id: 'question-2',
    bankId: 'bank-1',
    type: 'single-choice',
    content: 'Question 2',
    choices: [
      { id: 'q2-a', content: 'A' },
      { id: 'q2-b', content: 'B' },
    ],
    answerChoiceIds: ['q2-a'],
    explanation: 'Explanation 2',
    difficulty: 'easy',
    chapter: 'chapter-1',
    tags: ['tag-b'],
  },
  {
    id: 'question-3',
    bankId: 'bank-1',
    type: 'single-choice',
    content: 'Question 3',
    choices: [
      { id: 'q3-a', content: 'A' },
      { id: 'q3-b', content: 'B' },
    ],
    answerChoiceIds: ['q3-a'],
    explanation: 'Explanation 3',
    difficulty: 'hard',
    chapter: 'chapter-2',
    tags: ['tag-a'],
  },
  {
    id: 'question-4',
    bankId: 'bank-1',
    type: 'single-choice',
    content: 'Question 4',
    choices: [
      { id: 'q4-a', content: 'A' },
      { id: 'q4-b', content: 'B' },
    ],
    answerChoiceIds: ['q4-a'],
    explanation: 'Explanation 4',
    difficulty: 'medium',
    chapter: 'chapter-2',
    tags: ['tag-b'],
  },
]

function makeSettings(
  overrides: Partial<PracticeSettings> = {},
): PracticeSettings {
  return { ...baseSettings, ...overrides }
}

function makeAttempt(
  questionId: string,
  overrides: Partial<Attempt> = {},
): Attempt {
  return {
    id: `attempt-${questionId}`,
    sessionId: 'session-previous',
    bankId: 'bank-1',
    questionId,
    source: 'all',
    order: 'sequential',
    selectedChoiceIds: [`${questionId}-a`],
    isCorrect: true,
    answeredAt: '2026-07-10T01:00:00.000Z',
    ...overrides,
  }
}

function makeMistake(
  questionId: string,
  overrides: Partial<MistakeRecord> = {},
): MistakeRecord {
  return {
    id: `mistake-${questionId}`,
    bankId: 'bank-1',
    questionId,
    mistakeCount: 1,
    lastMistakenAt: '2026-07-10T01:00:00.000Z',
    ...overrides,
  }
}

function makeSession(
  overrides: Partial<PracticeSession> = {},
): PracticeSession {
  const { settings = baseSettings, ...sessionOverrides } = overrides

  return {
    id: 'session-1',
    bankId: 'bank-1',
    status: 'active',
    questionIds: ['question-1', 'question-2'],
    answers: {},
    currentIndex: 0,
    startedAt: '2026-07-10T01:00:00.000Z',
    updatedAt: '2026-07-10T01:00:00.000Z',
    ...sessionOverrides,
    settings: {
      ...baseSettings,
      ...settings,
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('getPracticeQuestions', () => {
  it('keeps all questions in sequential order for source all', () => {
    const result = getPracticeQuestions(
      questions,
      makeSettings(),
      [],
      [],
    )

    expect(result.map((question) => question.id)).toEqual(
      questions.map((question) => question.id),
    )
  })

  it('randomizes a copy while preserving the question set and input array', () => {
    const originalIds = questions.map((question) => question.id)

    const result = getPracticeQuestions(
      questions,
      makeSettings({ order: 'random' }),
      [],
      [],
    )

    expect(result).not.toBe(questions)
    expect(result.map((question) => question.id).sort()).toEqual(
      [...originalIds].sort(),
    )
    expect(questions.map((question) => question.id)).toEqual(originalIds)
  })

  it('selects only questions without an attempt for source unpracticed', () => {
    const result = getPracticeQuestions(
      questions,
      makeSettings({ source: 'unpracticed' }),
      [makeAttempt('question-1'), makeAttempt('question-3')],
      [],
    )

    expect(result.map((question) => question.id)).toEqual([
      'question-2',
      'question-4',
    ])
  })

  it('selects only active mistakes for source mistakes', () => {
    const result = getPracticeQuestions(
      questions,
      makeSettings({ source: 'mistakes' }),
      [],
      [
        makeMistake('question-2'),
        makeMistake('question-3', {
          masteredAt: '2026-07-10T02:00:00.000Z',
        }),
      ],
    )

    expect(result.map((question) => question.id)).toEqual(['question-2'])
  })

  it('does not apply mistake filtering unless source is mistakes', () => {
    const mistakes = [makeMistake('question-2')]

    const allResult = getPracticeQuestions(
      questions,
      makeSettings({ source: 'all' }),
      [],
      mistakes,
    )
    const mistakeResult = getPracticeQuestions(
      questions,
      makeSettings({ source: 'mistakes' }),
      [],
      mistakes,
    )

    expect(allResult).toHaveLength(questions.length)
    expect(mistakeResult.map((question) => question.id)).toEqual([
      'question-2',
    ])
  })

  it('combines chapter and tag filters', () => {
    const result = getPracticeQuestions(
      questions,
      makeSettings({ chapter: 'chapter-1', tag: 'tag-a' }),
      [],
      [],
    )

    expect(result.map((question) => question.id)).toEqual(['question-1'])
  })

  it('orders questions by ascending difficulty without mutating input', () => {
    const originalIds = questions.map((question) => question.id)

    const result = getPracticeQuestions(
      questions,
      makeSettings({ order: 'difficulty-ascending' }),
      [],
      [],
    )

    expect(result.map((question) => question.id)).toEqual([
      'question-2',
      'question-1',
      'question-4',
      'question-3',
    ])
    expect(questions.map((question) => question.id)).toEqual(originalIds)
  })
})

describe('practice session creation and progress', () => {
  it('creates an active session with a settings snapshot and no persisted counters', () => {
    const settings = makeSettings({
      source: 'mistakes',
      order: 'random',
      chapter: 'chapter-1',
      tag: 'tag-a',
    })

    const session = createPracticeSession('bank-1', questions, settings)

    expect(session).toMatchObject({
      bankId: 'bank-1',
      settings,
      status: 'active',
      questionIds: questions.map((question) => question.id),
      answers: {},
      currentIndex: 0,
    })
    expect(session.settings).not.toBe(settings)
    expect(session).not.toHaveProperty('totalCount')
    expect(session).not.toHaveProperty('answeredCount')
    expect(session).not.toHaveProperty('correctCount')
    expect(session).not.toHaveProperty('orderStrategy')
  })

  it('creates an attempt with source and order snapshots from its session', () => {
    const session = makeSession({
      settings: makeSettings({ source: 'mistakes', order: 'random' }),
    })

    const attempt = createAttempt(
      session,
      'question-1',
      'q1-a',
      true,
    )

    expect(attempt).toMatchObject({
      sessionId: session.id,
      bankId: session.bankId,
      questionId: 'question-1',
      source: 'mistakes',
      order: 'random',
      selectedChoiceIds: ['q1-a'],
      isCorrect: true,
    })
    expect(attempt).not.toHaveProperty('mode')
  })

  const progressSession = makeSession({
    questionIds: ['question-1', 'question-2', 'question-3'],
    answers: {
      'question-1': {
        selectedChoiceId: 'q1-a',
        submitted: true,
        isCorrect: true,
        answeredAt: '2026-07-10T01:01:00.000Z',
      },
      'question-2': {
        selectedChoiceId: 'q2-a',
        submitted: false,
      },
      'question-3': {
        selectedChoiceId: 'q3-b',
        submitted: true,
        isCorrect: false,
        answeredAt: '2026-07-10T01:02:00.000Z',
      },
      'not-in-session': {
        selectedChoiceId: 'ignored',
        submitted: true,
        isCorrect: true,
        answeredAt: '2026-07-10T01:03:00.000Z',
      },
    },
  })

  it('derives total question count from questionIds', () => {
    expect(getPracticeSessionProgress(progressSession).totalCount).toBe(3)
  })

  it('derives submitted answer count from answers for session questions', () => {
    expect(getPracticeSessionProgress(progressSession).answeredCount).toBe(2)
  })

  it('derives correct answer count from submitted answers', () => {
    expect(getPracticeSessionProgress(progressSession).correctCount).toBe(1)
  })

  it('derives incomplete state while any session question is unanswered', () => {
    expect(getPracticeSessionProgress(progressSession).isComplete).toBe(false)
  })

  it('derives completion and current correct rates', () => {
    expect(getPracticeSessionProgress(progressSession)).toMatchObject({
      completionRate: 67,
      correctRate: 50,
    })
  })

  it('derives complete state when every session question is submitted', () => {
    const session = makeSession({
      questionIds: ['question-1', 'question-2'],
      answers: {
        'question-1': {
          selectedChoiceId: 'q1-a',
          submitted: true,
          isCorrect: true,
          answeredAt: '2026-07-10T01:01:00.000Z',
        },
        'question-2': {
          selectedChoiceId: 'q2-b',
          submitted: true,
          isCorrect: false,
          answeredAt: '2026-07-10T01:02:00.000Z',
        },
      },
    })

    expect(getPracticeSessionProgress(session).isComplete).toBe(true)
  })
})

describe('practice session lifecycle', () => {
  it('finds only an active session for the requested bank', () => {
    const sessions = [
      makeSession({ id: 'finished', status: 'finished' }),
      makeSession({ id: 'abandoned', status: 'abandoned' }),
      makeSession({ id: 'other-bank', bankId: 'bank-2' }),
      makeSession({ id: 'active' }),
    ]

    expect(getActivePracticeSession(sessions, 'bank-1')?.id).toBe('active')
    expect(getActivePracticeSession(sessions, 'missing-bank')).toBeUndefined()
  })

  it('abandons every previous active session for the bank when starting a new one', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-10T03:00:00.000Z')
    const previousSessions = [
      makeSession({ id: 'old-active-1' }),
      makeSession({ id: 'old-active-2' }),
      makeSession({ id: 'old-finished', status: 'finished' }),
      makeSession({ id: 'other-bank', bankId: 'bank-2' }),
    ]
    const nextSession = makeSession({ id: 'new-active' })

    const result = startPracticeSession(previousSessions, nextSession)

    expect(
      result.filter(
        (session) =>
          session.bankId === 'bank-1' && session.status === 'active',
      ),
    ).toEqual([nextSession])
    expect(
      result
        .filter((session) => session.id.startsWith('old-active'))
        .every(
          (session) =>
            session.status === 'abandoned' &&
            session.abandonedAt === '2026-07-10T03:00:00.000Z',
        ),
    ).toBe(true)
    expect(result.find((session) => session.id === 'old-finished')).toBe(
      previousSessions[2],
    )
    expect(result.find((session) => session.id === 'other-bank')).toBe(
      previousSessions[3],
    )
    expect(previousSessions[0].status).toBe('active')
  })

  it('keeps at most one active session per bank after starting practice', () => {
    const result = startPracticeSession(
      [
        makeSession({ id: 'old-1' }),
        makeSession({ id: 'old-2' }),
      ],
      makeSession({ id: 'new' }),
    )

    expect(
      result.filter(
        (session) =>
          session.bankId === 'bank-1' && session.status === 'active',
      ),
    ).toHaveLength(1)
  })

  it('finishes a session without deleting it or breaking attempt references', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-10T04:00:00.000Z')
    const session = makeSession({
      questionIds: ['question-1'],
      answers: {
        'question-1': {
          selectedChoiceId: 'q1-a',
          submitted: true,
          isCorrect: true,
          answeredAt: '2026-07-10T03:59:00.000Z',
        },
      },
    })
    const attempt = makeAttempt('question-1', { sessionId: session.id })

    const result = finishPracticeSession([session], session.id)
    const finished = result.find((item) => item.id === session.id)

    expect(finished).toMatchObject({
      status: 'finished',
      finishedAt: '2026-07-10T04:00:00.000Z',
      updatedAt: '2026-07-10T04:00:00.000Z',
      questionIds: session.questionIds,
      answers: session.answers,
    })
    expect(result.some((item) => item.id === attempt.sessionId)).toBe(true)
    expect(session.status).toBe('active')
  })

  it('abandons an active session without deleting its history', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-10T05:00:00.000Z')
    const session = makeSession()

    const result = abandonPracticeSession([session], session.id)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: session.id,
      status: 'abandoned',
      abandonedAt: '2026-07-10T05:00:00.000Z',
      updatedAt: '2026-07-10T05:00:00.000Z',
      questionIds: session.questionIds,
      answers: session.answers,
    })
  })
})
