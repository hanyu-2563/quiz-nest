import { useEffect, useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import type { OptionState } from '../components/OptionButton'
import { QuestionCard } from '../components/QuestionCard'
import type {
  AnswerSubmissionMode,
  MistakeRecord,
  PracticeSession,
  Question,
  QuestionBank,
} from '../types/quiz'
import { getQuestionDifficulty } from '../utils/difficulty'

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

const modeLabels = {
  sequential: '顺序练习',
  random: '随机练习',
  'difficulty-ascending': '难度递增',
  'mistake-review': '错题复习',
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
  const question = questions[session.currentIndex]
  const answer = question ? session.answers[question.id] : undefined
  const selectedChoiceId = answer?.selectedChoiceId ?? null
  const submitted = answer?.submitted ?? false
  const allAnswered =
    session.totalCount > 0 &&
    session.answeredCount === session.totalCount
  const completionRate =
    session.totalCount === 0
      ? 0
      : Math.round((session.answeredCount / session.totalCount) * 100)
  const currentCorrectRate =
    session.answeredCount === 0
      ? null
      : Math.round((session.correctCount / session.answeredCount) * 100)

  function selectChoice(choiceId: string) {
    if (!question || submitted) {
      return
    }

    onSelectChoice(question.id, choiceId)

    if (submissionMode === 'immediate') {
      onSubmitAnswer(question, choiceId)
    }
  }

  function moveBackward() {
    if (session.currentIndex > 0) {
      onNavigate(session.currentIndex - 1)
    }
  }

  function moveForward() {
    if (session.currentIndex < questions.length - 1) {
      onNavigate(session.currentIndex + 1)
      return
    }

    if (allAnswered) {
      onFinish()
      return
    }

    const unansweredIndex = questions.findIndex(
      (item) => !session.answers[item.id]?.submitted,
    )

    if (unansweredIndex >= 0) {
      onNavigate(unansweredIndex)
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
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
        !submitted
      ) {
        event.preventDefault()
        selectChoice(question.choices[choiceIndex].id)
        return
      }

      if (key === 'enter' && question) {
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
      <section className="page">
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

    return 'default'
  }

  return (
    <section className="page practice-page">
      <div className="practice-header">
        <div>
          <p className="eyebrow">{modeLabels[session.mode]}</p>
          <h1>{bank.name}</h1>
        </div>
        <div className="practice-header-actions">
          <label className="submission-mode-setting">
            <span>答题提交方式</span>
            <select
              value={submissionMode}
              onChange={(event) =>
                onSubmissionModeChange(
                  event.target.value as AnswerSubmissionMode,
                )
              }
            >
              <option value="immediate">选择选项后立即提交</option>
              <option value="manual">选择选项后手动提交</option>
            </select>
          </label>
          <button className="text-button" type="button" onClick={onExit}>
            保存并退出
          </button>
        </div>
      </div>

      <section className="practice-status" aria-label="练习状态">
        <div className="practice-status-item">
          <span>当前题目</span>
          <strong>
            {session.currentIndex + 1} / {session.totalCount}
          </strong>
        </div>
        <div className="practice-status-item">
          <span>已完成</span>
          <strong>{session.answeredCount} 题</strong>
        </div>
        <div className="practice-status-progress">
          <div>
            <span>做题进度</span>
            <strong>{completionRate}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="已提交题目进度"
            aria-valuemin={0}
            aria-valuemax={session.totalCount}
            aria-valuenow={session.answeredCount}
          >
            <span style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="practice-status-item">
          <span>当前正确率</span>
          <strong>
            {currentCorrectRate === null ? '—' : `${currentCorrectRate}%`}
          </strong>
        </div>
      </section>

      <QuestionCard question={question} difficulty={difficulty} />

      <div className="option-list" aria-label="答案选项">
        {question.choices.map((choice, index) => (
          <OptionButton
            key={choice.id}
            choice={choice}
            shortcutLabel={String.fromCharCode(65 + index)}
            selected={choice.id === selectedChoiceId}
            disabled={submitted}
            state={getOptionState(choice.id)}
            onSelect={selectChoice}
          />
        ))}
      </div>

      <div className="practice-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={session.currentIndex === 0}
          onClick={moveBackward}
        >
          上一题
        </button>

        {!submitted && submissionMode === 'manual' ? (
          <button
            type="button"
            disabled={selectedChoiceId === null}
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
            选择选项后将立即提交
          </span>
        ) : (
          <button type="button" onClick={moveForward}>
            {session.currentIndex < questions.length - 1
              ? '下一题'
              : allAnswered
                ? '完成练习'
                : '前往未答题'}
          </button>
        )}
      </div>

      {submitted && (
        <div
          className={`answer-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}
          role="status"
        >
          <h2>{isCorrect ? '回答正确' : '回答错误'}</h2>
          {!isCorrect && correctChoice && (
            <p>
              正确答案：<strong>{correctChoice.content}</strong>
            </p>
          )}

          <button
            className="text-button explanation-toggle"
            type="button"
            onClick={() =>
              setHiddenExplanationQuestionId((current) =>
                current === question.id ? null : question.id,
              )
            }
          >
            {explanationVisible ? '隐藏解析（R）' : '显示解析（R）'}
          </button>

          {explanationVisible && (
            <p className="explanation">{question.explanation}</p>
          )}

          {session.mode === 'mistake-review' && isCorrect && (
            <button
              className="secondary-button"
              type="button"
              disabled={Boolean(currentMistake?.masteredAt)}
              onClick={() => onMarkMastered(question.id)}
            >
              {currentMistake?.masteredAt
                ? '已标记为掌握'
                : '标记为已掌握'}
            </button>
          )}
        </div>
      )}

      <p className="keyboard-help">
        {submissionMode === 'immediate'
          ? '快捷键：1-4 或 A-D 选择并提交，Enter 下一题，←/→ 切题，R 显示或隐藏解析'
          : '快捷键：1-4 或 A-D 选择，Enter 提交/下一题，←/→ 切题，R 显示或隐藏解析'}
      </p>
    </section>
  )
}
