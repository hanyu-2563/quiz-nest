import { useEffect, useRef, useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import type { OptionState } from '../components/OptionButton'
import { QuestionCard } from '../components/QuestionCard'
import type {
  AnswerSubmissionMode,
  MistakeRecord,
  PracticeOrder,
  PracticeSession,
  PracticeSettings,
  PracticeSource,
  Question,
  QuestionBank,
} from '../types/quiz'
import { getQuestionDifficulty } from '../utils/difficulty'
import { getPracticeSessionProgress } from '../utils/practice'

export interface PracticePageProps {
  bank: QuestionBank
  questions: Question[]
  session: PracticeSession
  mistakes: MistakeRecord[]
  submissionMode: AnswerSubmissionMode
  onExit: () => void
  onSubmissionModeChange: (mode: AnswerSubmissionMode) => void
  onSelectChoice: (questionId: string, choiceId: string) => void
  onSubmitAnswer: (question: Question, choiceId: string) => void
  onNavigate: (index: number) => void
  onFinish: () => void
  onMarkMastered: (questionId: string) => void
}

const sourceLabels: Record<PracticeSource, string> = {
  all: '全部题目',
  unpracticed: '未练习题',
  mistakes: '错题复习',
}

const orderLabels: Record<PracticeOrder, string> = {
  sequential: '顺序练习',
  random: '随机练习',
  'difficulty-ascending': '难度递增',
}

type TransitionPhase = 'idle' | 'leaving' | 'entering'
type TransitionDirection = 'forward' | 'backward'

function formatPracticeLabel(settings: PracticeSettings) {
  return `${sourceLabels[settings.source]} · ${orderLabels[settings.order]}`
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () =>
      setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}

export function PracticePage({
  bank,
  questions,
  session,
  mistakes,
  submissionMode,
  onExit,
  onSubmissionModeChange,
  onSelectChoice,
  onSubmitAnswer,
  onNavigate,
  onFinish,
  onMarkMastered,
}: PracticePageProps) {
  const [hiddenExplanationQuestionId, setHiddenExplanationQuestionId] =
    useState<string | null>(null)
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>('idle')
  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>('forward')
  const stageRef = useRef<HTMLDivElement>(null)
  const previousIndexRef = useRef(session.currentIndex)
  const pendingIndexRef = useRef<number | null>(null)
  const navigationTimeoutRef = useRef<number | null>(null)
  const entryFrameRef = useRef<number | null>(null)
  const settleFrameRef = useRef<number | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const question = questions[session.currentIndex]
  const answer = question ? session.answers[question.id] : undefined
  const selectedChoiceId = answer?.selectedChoiceId ?? null
  const submitted = answer?.submitted ?? false
  const sessionProgress = getPracticeSessionProgress(session)
  const navigationLocked = transitionPhase !== 'idle'

  function selectChoice(choiceId: string) {
    if (!question || submitted || navigationLocked) {
      return
    }

    onSelectChoice(question.id, choiceId)

    if (submissionMode === 'immediate') {
      onSubmitAnswer(question, choiceId)
    }
  }

  function requestNavigation(targetIndex: number) {
    if (
      navigationLocked ||
      targetIndex === session.currentIndex ||
      targetIndex < 0 ||
      targetIndex >= questions.length
    ) {
      return
    }

    pendingIndexRef.current = targetIndex
    setTransitionDirection(
      targetIndex > session.currentIndex ? 'forward' : 'backward',
    )

    if (prefersReducedMotion) {
      onNavigate(targetIndex)
      return
    }

    setTransitionPhase('leaving')
    navigationTimeoutRef.current = window.setTimeout(() => {
      onNavigate(targetIndex)
      navigationTimeoutRef.current = null
    }, 120)
  }

  function moveBackward() {
    if (session.currentIndex > 0) {
      requestNavigation(session.currentIndex - 1)
    }
  }

  function moveForward() {
    if (navigationLocked) {
      return
    }

    if (session.currentIndex < questions.length - 1) {
      requestNavigation(session.currentIndex + 1)
      return
    }

    if (sessionProgress.isComplete) {
      onFinish()
      return
    }

    const unansweredIndex = questions.findIndex(
      (item, index) =>
        index !== session.currentIndex &&
        !session.answers[item.id]?.submitted,
    )

    if (unansweredIndex >= 0) {
      requestNavigation(unansweredIndex)
    }
  }

  useEffect(() => {
    const indexChanged = previousIndexRef.current !== session.currentIndex
    previousIndexRef.current = session.currentIndex

    if (!indexChanged) {
      return
    }

    setHiddenExplanationQuestionId(null)

    const stage = stageRef.current
    if (stage && stage.getBoundingClientRect().top < 72) {
      stage.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
    stage?.focus({ preventScroll: true })

    if (
      prefersReducedMotion ||
      pendingIndexRef.current !== session.currentIndex
    ) {
      pendingIndexRef.current = null
      setTransitionPhase('idle')
      return
    }

    setTransitionPhase('entering')
    entryFrameRef.current = window.requestAnimationFrame(() => {
      settleFrameRef.current = window.requestAnimationFrame(() => {
        pendingIndexRef.current = null
        setTransitionPhase('idle')
        entryFrameRef.current = null
        settleFrameRef.current = null
      })
    })
  }, [prefersReducedMotion, session.currentIndex])

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current !== null) {
        window.clearTimeout(navigationTimeoutRef.current)
      }
      if (entryFrameRef.current !== null) {
        window.cancelAnimationFrame(entryFrameRef.current)
      }
      if (settleFrameRef.current !== null) {
        window.cancelAnimationFrame(settleFrameRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement &&
          event.target.isContentEditable)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const numericIndex = Number(key) - 1
      const letterIndex = ['a', 'b', 'c', 'd'].indexOf(key)
      const choiceIndex =
        numericIndex >= 0 && numericIndex <= 3
          ? numericIndex
          : letterIndex

      if (
        choiceIndex >= 0 &&
        choiceIndex < (question?.choices.length ?? 0) &&
        question &&
        !submitted &&
        !navigationLocked
      ) {
        event.preventDefault()
        selectChoice(question.choices[choiceIndex].id)
        return
      }

      if (key === 'enter' && question && !navigationLocked) {
        event.preventDefault()

        if (!submitted && selectedChoiceId) {
          onSubmitAnswer(question, selectedChoiceId)
        } else if (submitted) {
          moveForward()
        }
        return
      }

      if (key === 'arrowleft') {
        event.preventDefault()
        moveBackward()
      }

      if (key === 'arrowright') {
        event.preventDefault()
        moveForward()
      }

      if (key === 'r' && submitted && question) {
        event.preventDefault()
        setHiddenExplanationQuestionId((current) =>
          current === question.id ? null : question.id,
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!question) {
    return (
      <section className="page practice-empty-state">
        <h1>练习题目不可用</h1>
        <p>这组练习中的题目可能已被移除，请返回后重新开始。</p>
        <button type="button" onClick={onExit}>
          返回题库主页
        </button>
      </section>
    )
  }

  const isCorrect = submitted && Boolean(answer?.isCorrect)
  const correctChoice = question.choices.find((choice) =>
    question.answerChoiceIds.includes(choice.id),
  )
  const difficulty = getQuestionDifficulty(
    question,
    session.currentIndex,
    questions.length,
  )
  const currentMistake = mistakes.find(
    (mistake) => mistake.questionId === question.id,
  )
  const explanationVisible =
    submitted && hiddenExplanationQuestionId !== question.id
  const positionProgress = Math.round(
    ((session.currentIndex + 1) / sessionProgress.totalCount) * 100,
  )
  const hasAnotherQuestion =
    session.currentIndex < questions.length - 1 ||
    questions.some(
      (item, index) =>
        index !== session.currentIndex &&
        !session.answers[item.id]?.submitted,
    )

  function getOptionState(choiceId: string): OptionState {
    if (!submitted) {
      return 'default'
    }

    if (question.answerChoiceIds.includes(choiceId)) {
      return 'correct'
    }

    if (choiceId === selectedChoiceId) {
      return 'incorrect'
    }

    return 'dimmed'
  }

  return (
    <section className="page practice-page">
      <header className="practice-utility-bar">
        <div className="practice-context-line">
          <strong>{bank.name}</strong>
          <span>{formatPracticeLabel(session.settings)}</span>
        </div>
        <div className="practice-header-actions">
          <label className="submission-mode-setting">
            <span>提交方式</span>
            <select
              value={submissionMode}
              onChange={(event) =>
                onSubmissionModeChange(
                  event.target.value as AnswerSubmissionMode,
                )
              }
            >
              <option value="immediate">选择后立即提交</option>
              <option value="manual">选择后手动提交</option>
            </select>
          </label>
          <button
            className="text-button practice-exit"
            type="button"
            onClick={onExit}
          >
            保存并退出
          </button>
        </div>
      </header>

      <section className="practice-progress" aria-label="答题进度">
        <div className="practice-progress-copy">
          <strong>
            {session.currentIndex + 1}
            <span> / {sessionProgress.totalCount}</span>
          </strong>
          <span>已完成 {sessionProgress.answeredCount} 题</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="当前题目位置"
          aria-valuemin={1}
          aria-valuemax={sessionProgress.totalCount}
          aria-valuenow={session.currentIndex + 1}
        >
          <span style={{ width: `${positionProgress}%` }} />
        </div>
      </section>

      <div
        ref={stageRef}
        className="practice-question-stage"
        data-transition={transitionPhase}
        data-direction={transitionDirection}
        aria-busy={navigationLocked}
        tabIndex={-1}
      >
        <QuestionCard question={question} difficulty={difficulty} />

        <div
          className="option-list"
          role="group"
          aria-labelledby="practice-question-title"
        >
          {question.choices.map((choice, index) => (
            <OptionButton
              key={choice.id}
              choice={choice}
              shortcutLabel={String.fromCharCode(65 + index)}
              selected={choice.id === selectedChoiceId}
              disabled={submitted || navigationLocked}
              state={getOptionState(choice.id)}
              onSelect={selectChoice}
            />
          ))}
        </div>

        <div
          className={`answer-feedback-reveal ${submitted ? 'is-open' : ''}`}
        >
          <div className="answer-feedback-clip">
            {submitted && (
              <section
                className={`answer-feedback ${
                  isCorrect ? 'feedback-correct' : 'feedback-incorrect'
                }`}
                role="status"
              >
                <div className="feedback-heading">
                  <span className="feedback-mark" aria-hidden="true">
                    {isCorrect ? '✓' : '×'}
                  </span>
                  <div>
                    <h2>{isCorrect ? '回答正确' : '回答错误'}</h2>
                    {!isCorrect && correctChoice && (
                      <p className="correct-answer-copy">
                        正确答案：<strong>{correctChoice.content}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="explanation-block">
                  <div className="explanation-heading">
                    <h3>解析</h3>
                    <button
                      className="text-button explanation-toggle"
                      type="button"
                      aria-expanded={explanationVisible}
                      aria-controls={`explanation-${question.id}`}
                      onClick={() =>
                        setHiddenExplanationQuestionId((current) =>
                          current === question.id ? null : question.id,
                        )
                      }
                    >
                      {explanationVisible ? '隐藏（R）' : '显示（R）'}
                    </button>
                  </div>

                  {explanationVisible && (
                    <p
                      className="explanation"
                      id={`explanation-${question.id}`}
                    >
                      {question.explanation}
                    </p>
                  )}
                </div>

                {session.settings.source === 'mistakes' && isCorrect && (
                  <button
                    className="secondary-button mastered-button"
                    type="button"
                    disabled={Boolean(currentMistake?.masteredAt)}
                    onClick={() => onMarkMastered(question.id)}
                  >
                    {currentMistake?.masteredAt
                      ? '已标记为掌握'
                      : '标记为已掌握'}
                  </button>
                )}
              </section>
            )}
          </div>
        </div>

        <nav className="practice-actions" aria-label="题目操作">
          <button
            className="secondary-button previous-question-button"
            type="button"
            disabled={session.currentIndex === 0 || navigationLocked}
            onClick={moveBackward}
          >
            上一题
          </button>

          <div className="practice-primary-actions">
            {!submitted && (
              <button
                className="text-button skip-question-button"
                type="button"
                disabled={!hasAnotherQuestion || navigationLocked}
                onClick={moveForward}
              >
                暂时跳过
              </button>
            )}

            {!submitted && submissionMode === 'manual' ? (
              <button
                className="primary-question-action"
                type="button"
                disabled={selectedChoiceId === null || navigationLocked}
                onClick={() => {
                  if (selectedChoiceId) {
                    onSubmitAnswer(question, selectedChoiceId)
                  }
                }}
              >
                提交答案
              </button>
            ) : !submitted ? (
              <span className="immediate-submit-hint">
                选择选项后立即提交
              </span>
            ) : (
              <button
                className="primary-question-action"
                type="button"
                disabled={navigationLocked}
                onClick={moveForward}
              >
                {session.currentIndex < questions.length - 1
                  ? '继续'
                  : sessionProgress.isComplete
                    ? '完成练习'
                    : '前往未答题'}
              </button>
            )}
          </div>
        </nav>

        <p className="keyboard-help">
          {submissionMode === 'immediate'
            ? '快捷键：1–4 或 A–D 选择并提交，Enter 继续，← / → 切题，R 显示或隐藏解析'
            : '快捷键：1–4 或 A–D 选择，Enter 提交或继续，← / → 切题，R 显示或隐藏解析'}
        </p>
      </div>
    </section>
  )
}
