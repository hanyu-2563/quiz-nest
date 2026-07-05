import { useEffect, useState } from 'react'
import './App.css'
import { mockQuestionBanks, mockQuestions } from './data/mockData'
import { useLocalStorage } from './hooks/useLocalStorage'
import { BankHome } from './pages/BankHome'
import { BankLobby } from './pages/BankLobby'
import { MistakePage } from './pages/MistakePage'
import { PracticePage } from './pages/PracticePage'
import type { PracticeSettings, Question } from './types/quiz'
import {
  createAttempt,
  createPracticeSession,
  getBankStatistics,
  getPracticeQuestions,
  updateMistakes,
} from './utils/practice'
import { defaultPracticeSettings } from './utils/storage'

type View = 'lobby' | 'bank-home' | 'mistakes' | 'practice'

function App() {
  const { data, setData, clearData } = useLocalStorage()
  const [view, setView] = useState<View>('lobby')
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = data.theme
  }, [data.theme])

  const selectedBank = mockQuestionBanks.find(
    (bank) => bank.id === selectedBankId,
  )
  const selectedQuestions = selectedBank
    ? mockQuestions.filter(
        (question) =>
          question.bankId === selectedBank.id &&
          question.type === 'single-choice',
      )
    : []
  const bankAttempts = selectedBank
    ? data.attempts.filter(
        (attempt) => attempt.bankId === selectedBank.id,
      )
    : []
  const bankMistakes = selectedBank
    ? data.mistakes.filter(
        (mistake) => mistake.bankId === selectedBank.id,
      )
    : []
  const activeSession = selectedBank
    ? data.sessions.find(
        (session) => session.bankId === selectedBank.id,
      )
    : undefined
  const practiceSettings = selectedBank
    ? {
        ...defaultPracticeSettings,
        ...data.practiceSettings[selectedBank.id],
      }
    : defaultPracticeSettings
  const availableQuestions = selectedBank
    ? getPracticeQuestions(
        selectedQuestions,
        practiceSettings,
        bankAttempts,
        bankMistakes,
      )
    : []
  const sessionQuestions = activeSession
    ? activeSession.questionIds
        .map((questionId) =>
          selectedQuestions.find(
            (question) => question.id === questionId,
          ),
        )
        .filter((question): question is Question => Boolean(question))
    : []
  const statistics = selectedBank
    ? getBankStatistics(
        selectedBank.id,
        selectedQuestions.length,
        data.attempts,
        data.mistakes,
      )
    : undefined

  function openBank(bankId: string) {
    setSelectedBankId(bankId)
    setView('bank-home')
  }

  function returnToLobby() {
    setSelectedBankId(null)
    setView('lobby')
  }

  function updatePracticeSettings(settings: PracticeSettings) {
    if (!selectedBank) {
      return
    }

    setData((current) => ({
      ...current,
      practiceSettings: {
        ...current.practiceSettings,
        [selectedBank.id]: settings,
      },
    }))
  }

  function startPractice(settings = practiceSettings) {
    if (!selectedBank) {
      return
    }

    const questions = getPracticeQuestions(
      selectedQuestions,
      settings,
      bankAttempts,
      bankMistakes,
    )

    if (questions.length === 0) {
      window.alert('当前条件下没有可练习的题目。')
      return
    }

    if (
      activeSession &&
      !window.confirm('开始新练习会覆盖当前未完成的练习，是否继续？')
    ) {
      return
    }

    const session = createPracticeSession(
      selectedBank.id,
      questions,
      settings.mode,
    )

    setData((current) => ({
      ...current,
      sessions: [
        ...current.sessions.filter(
          (item) => item.bankId !== selectedBank.id,
        ),
        session,
      ],
    }))
    setView('practice')
  }

  function startMistakeReview() {
    const reviewSettings: PracticeSettings = {
      ...defaultPracticeSettings,
      mode: 'mistake-review',
      onlyMistakes: true,
    }
    startPractice(reviewSettings)
  }

  function updateSession(
    updater: (
      session: NonNullable<typeof activeSession>,
    ) => NonNullable<typeof activeSession>,
  ) {
    if (!activeSession) {
      return
    }

    setData((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === activeSession.id ? updater(session) : session,
      ),
    }))
  }

  function selectChoice(questionId: string, choiceId: string) {
    updateSession((session) => {
      const existingAnswer = session.answers[questionId]

      if (existingAnswer?.submitted) {
        return session
      }

      return {
        ...session,
        answers: {
          ...session.answers,
          [questionId]: {
            selectedChoiceId: choiceId,
            submitted: false,
          },
        },
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function submitAnswer(question: Question, choiceId: string) {
    if (!activeSession || activeSession.answers[question.id]?.submitted) {
      return
    }

    const isCorrect = question.answerChoiceIds.includes(choiceId)
    const attempt = createAttempt(
      activeSession,
      question.id,
      choiceId,
      isCorrect,
    )

    setData((current) => {
      const sessions = current.sessions.map((session) => {
        if (session.id !== activeSession.id) {
          return session
        }

        const answers = {
          ...session.answers,
          [question.id]: {
            selectedChoiceId: choiceId,
            submitted: true,
            isCorrect,
            answeredAt: attempt.answeredAt,
          },
        }
        const submittedAnswers = Object.values(answers).filter(
          (answer) => answer.submitted,
        )

        return {
          ...session,
          answers,
          answeredCount: submittedAnswers.length,
          correctCount: submittedAnswers.filter(
            (answer) => answer.isCorrect,
          ).length,
          updatedAt: attempt.answeredAt,
        }
      })

      return {
        ...current,
        attempts: [...current.attempts, attempt],
        mistakes: updateMistakes(current.mistakes, attempt),
        sessions,
      }
    })
  }

  function navigatePractice(index: number) {
    updateSession((session) => ({
      ...session,
      currentIndex: index,
      updatedAt: new Date().toISOString(),
    }))
  }

  function markMistakeMastered(questionId: string) {
    const answer = activeSession?.answers[questionId]

    if (!answer?.submitted || !answer.isCorrect) {
      return
    }

    setData((current) => ({
      ...current,
      mistakes: current.mistakes.map((mistake) =>
        mistake.bankId === selectedBankId &&
        mistake.questionId === questionId
          ? { ...mistake, masteredAt: new Date().toISOString() }
          : mistake,
      ),
    }))
  }

  function finishPractice() {
    if (!activeSession) {
      return
    }

    setData((current) => ({
      ...current,
      sessions: current.sessions.filter(
        (session) => session.id !== activeSession.id,
      ),
    }))
    setView('bank-home')
  }

  function resetCurrentBankPractice() {
    if (
      !selectedBank ||
      !window.confirm(
        '将删除当前题库的答题记录和未完成练习，错题记录会保留。是否继续？',
      )
    ) {
      return
    }

    setData((current) => ({
      ...current,
      attempts: current.attempts.filter(
        (attempt) => attempt.bankId !== selectedBank.id,
      ),
      mistakes: current.mistakes.map((mistake) =>
        mistake.bankId === selectedBank.id
          ? { ...mistake, latestAttemptId: undefined }
          : mistake,
      ),
      sessions: current.sessions.filter(
        (session) => session.bankId !== selectedBank.id,
      ),
    }))
  }

  function clearCurrentBankMistakes() {
    if (
      !selectedBank ||
      !window.confirm('将清空当前题库的全部错题记录，是否继续？')
    ) {
      return
    }

    setData((current) => ({
      ...current,
      mistakes: current.mistakes.filter(
        (mistake) => mistake.bankId !== selectedBank.id,
      ),
      sessions: current.sessions.filter(
        (session) =>
          session.bankId !== selectedBank.id ||
          session.mode !== 'mistake-review',
      ),
    }))
  }

  function clearAllLocalData() {
    if (
      !window.confirm(
        '将清空全部题库的练习、错题、设置和夜间模式数据，是否继续？',
      )
    ) {
      return
    }

    clearData()
    returnToLobby()
  }

  function toggleTheme() {
    setData((current) => ({
      ...current,
      theme: current.theme === 'light' ? 'dark' : 'light',
    }))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={returnToLobby}>
          QuizNest
        </button>
        <span>先选择题库，再开始专注刷题。</span>
        <button
          className="theme-button"
          type="button"
          onClick={toggleTheme}
          aria-label="切换浅色或深色模式"
        >
          {data.theme === 'light' ? '切换深色' : '切换浅色'}
        </button>
      </header>

      <main className="app-content">
        {view === 'lobby' && (
          <BankLobby banks={mockQuestionBanks} onSelectBank={openBank} />
        )}

        {view === 'bank-home' && selectedBank && statistics && (
          <BankHome
            bank={selectedBank}
            questions={selectedQuestions}
            statistics={statistics}
            settings={practiceSettings}
            availableQuestionCount={availableQuestions.length}
            activeSession={activeSession}
            onBack={returnToLobby}
            onSettingsChange={updatePracticeSettings}
            onStartPractice={() => startPractice()}
            onContinuePractice={() => setView('practice')}
            onOpenMistakes={() => setView('mistakes')}
            onResetPractice={resetCurrentBankPractice}
            onClearMistakes={clearCurrentBankMistakes}
            onClearAllData={clearAllLocalData}
          />
        )}

        {view === 'mistakes' && selectedBank && (
          <MistakePage
            bank={selectedBank}
            questions={selectedQuestions}
            mistakes={bankMistakes}
            onBack={() => setView('bank-home')}
            onStartReview={startMistakeReview}
          />
        )}

        {view === 'practice' &&
          selectedBank &&
          activeSession && (
            <PracticePage
              bank={selectedBank}
              questions={sessionQuestions}
              session={activeSession}
              mistakes={bankMistakes}
              onExit={() => setView('bank-home')}
              onSelectChoice={selectChoice}
              onSubmitAnswer={submitAnswer}
              onNavigate={navigatePractice}
              onFinish={finishPractice}
              onMarkMastered={markMistakeMastered}
            />
          )}
      </main>
    </div>
  )
}

export default App
