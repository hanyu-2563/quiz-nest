import { useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import type { OptionState } from '../components/OptionButton'
import { QuestionCard } from '../components/QuestionCard'
import type { Question, QuestionBank } from '../types/quiz'
import { getQuestionDifficulty } from '../utils/difficulty'

export interface PracticePageProps {
  bank: QuestionBank
  questions: Question[]
  onExit: () => void
}

export function PracticePage({
  bank,
  questions,
  onExit,
}: PracticePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const question = questions[currentIndex]

  if (!question) {
    return (
      <section className="page">
        <h1>暂无可用题目</h1>
        <p>这个题库目前还没有单选题。</p>
        <button type="button" onClick={onExit}>
          返回题库主页
        </button>
      </section>
    )
  }

  const isCorrect =
    submitted &&
    selectedChoiceId !== null &&
    question.answerChoiceIds.includes(selectedChoiceId)
  const correctChoice = question.choices.find((choice) =>
    question.answerChoiceIds.includes(choice.id),
  )
  const isLastQuestion = currentIndex === questions.length - 1
  const difficulty = getQuestionDifficulty(
    question,
    currentIndex,
    questions.length,
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

    return 'default'
  }

  function continuePractice() {
    if (isLastQuestion) {
      onExit()
      return
    }

    setCurrentIndex((index) => index + 1)
    setSelectedChoiceId(null)
    setSubmitted(false)
  }

  return (
    <section className="page practice-page">
      <div className="practice-header">
        <div>
          <p className="eyebrow">刷题练习</p>
          <h1>{bank.name}</h1>
        </div>
        <button className="text-button" type="button" onClick={onExit}>
          退出刷题
        </button>
      </div>

      <QuestionCard
        question={question}
        difficulty={difficulty}
        position={currentIndex + 1}
        total={questions.length}
      />

      <div className="option-list" aria-label="答案选项">
        {question.choices.map((choice) => (
          <OptionButton
            key={choice.id}
            choice={choice}
            selected={choice.id === selectedChoiceId}
            disabled={submitted}
            state={getOptionState(choice.id)}
            onSelect={setSelectedChoiceId}
          />
        ))}
      </div>

      {!submitted && (
        <button
          type="button"
          disabled={selectedChoiceId === null}
          onClick={() => setSubmitted(true)}
        >
          提交答案
        </button>
      )}

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
          <p>{question.explanation}</p>
          <button type="button" onClick={continuePractice}>
            {isLastQuestion ? '完成练习' : '下一题'}
          </button>
        </div>
      )}
    </section>
  )
}
