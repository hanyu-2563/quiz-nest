import { useEffect, useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import type { OptionState } from '../components/OptionButton'
import { QuestionCard } from '../components/QuestionCard'
import type {
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
  onExit: () => void
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
  onExit,
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
        onSelectChoice(question.id, question.choices[choiceIndex].id)
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
        <button className="text-button" type="button" onClick={onExit}>
          保存并退出
        </button>
      </div>

      <QuestionCard
        question={question}
        difficulty={difficulty}
        position={session.currentIndex + 1}
        total={questions.length}
      />

      <div className="option-list" aria-label="答案选项">
        {question.choices.map((choice, index) => (
          <OptionButton
            key={choice.id}
            choice={choice}
            shortcutLabel={String.fromCharCode(65 + index)}
            selected={choice.id === selectedChoiceId}
            disabled={submitted}
            state={getOptionState(choice.id)}
            onSelect={(choiceId) =>
              onSelectChoice(question.id, choiceId)
            }
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

        {!submitted ? (
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
        快捷键：1-4 或 A-D 选择，Enter 提交/下一题，←/→ 切题，R
        显示或隐藏解析
      </p>
    </section>
  )
}
