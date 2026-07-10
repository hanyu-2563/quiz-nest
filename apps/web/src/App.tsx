import { useEffect, useState } from 'react'
import './App.css'
import {
  BankWorkspace,
  type WorkspaceSection,
} from './components/BankWorkspace'
import { mockQuestionBanks, mockQuestions } from './data/mockData'
import { useLocalStorage } from './hooks/useLocalStorage'
import { BankHome } from './pages/BankHome'
import { BankLobby } from './pages/BankLobby'
import { MistakePage } from './pages/MistakePage'
import { PracticePage } from './pages/PracticePage'
import type {
  AnswerSubmissionMode,
  PracticeSettings,
  Question,
} from './types/quiz'
import {
  abandonPracticeSession,
  createAttempt,
  createPracticeSession,
  finishPracticeSession,
  getActivePracticeSession,
  getBankStatistics,
  getPracticeQuestions,
  startPracticeSession,
  updateMistakes,
} from './utils/practice'
import { defaultPracticeSettings } from './utils/storage'

type View = 'lobby' | 'bank-home' | 'mistakes' | 'practice'

function App() {
  const { data, setData, clearData } = useLocalStorage()
  const [view, setView] = useState<View>('lobby')
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
  const [bankSection, setBankSection] =
    useState<Exclude<WorkspaceSection, 'mistakes'>>('overview')

  useEffect(() => {
    document.documentElement.dataset.theme = data.theme
  }, [data.theme])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view, selectedBankId, bankSection])

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
    ? getActivePracticeSession(data.sessions, selectedBank.id)
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
  const lobbyItems = mockQuestionBanks.map((bank) => {
    const questionCount = mockQuestions.filter(
      (question) =>
        question.bankId === bank.id && question.type === 'single-choice',
    ).length

    return {
      bank,
      statistics: getBankStatistics(
        bank.id,
        questionCount,
        data.attempts,
        data.mistakes,
      ),
      activeSession: getActivePracticeSession(data.sessions, bank.id),
    }
  })
  const hasLocalData =
    data.attempts.length > 0 ||
    data.mistakes.length > 0 ||
    data.sessions.length > 0 ||
    Object.keys(data.practiceSettings).length > 0 ||
    data.answerSubmissionMode !== 'manual' ||
    data.theme === 'dark'

  function openBank(bankId: string) {
    setSelectedBankId(bankId)
    setBankSection('overview')
    setView('bank-home')
  }

  function returnToLobby() {
    setSelectedBankId(null)
    setBankSection('overview')
    setView('lobby')
  }

  function navigateWorkspace(section: WorkspaceSection) {
    if (section === 'mistakes') {
      setView('mistakes')
      return
    }

    setBankSection(section)
    setView('bank-home')
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
      !window.confirm('开始新练习会放弃当前未完成的练习，是否继续？')
    ) {
      return
    }

    const session = createPracticeSession(
      selectedBank.id,
      questions,
      settings,
    )

    setData((current) => ({
      ...current,
      sessions: startPracticeSession(current.sessions, session),
    }))
    setView('practice')
  }

  function startMistakeReview() {
    const reviewSettings: PracticeSettings = {
      ...defaultPracticeSettings,
      source: 'mistakes',
      order: 'sequential',
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
        session.id === activeSession.id && session.status === 'active'
          ? updater(session)
          : session,
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
    if (!activeSession) {
      return
    }

    const isCorrect = question.answerChoiceIds.includes(choiceId)

    setData((current) => {
      const currentSession = current.sessions.find(
        (session) => session.id === activeSession.id,
      )

      if (
        !currentSession ||
        currentSession.status !== 'active' ||
        currentSession.answers[question.id]?.submitted
      ) {
        return current
      }

      const attempt = createAttempt(
        currentSession,
        question.id,
        choiceId,
        isCorrect,
      )
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
        return {
          ...session,
          answers,
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
      sessions: finishPracticeSession(
        current.sessions,
        activeSession.id,
      ),
    }))
    setBankSection('overview')
    setView('bank-home')
  }

  function resetCurrentBankPractice() {
    if (
      !selectedBank ||
      !window.confirm(
        '将删除当前题库的答题记录并结束未完成练习，错题记录和练习会话历史会保留。是否继续？',
      )
    ) {
      return
    }

    setData((current) => {
      const currentSession = getActivePracticeSession(
        current.sessions,
        selectedBank.id,
      )

      return {
        ...current,
        attempts: current.attempts.filter(
          (attempt) => attempt.bankId !== selectedBank.id,
        ),
        mistakes: current.mistakes.map((mistake) =>
          mistake.bankId === selectedBank.id
            ? { ...mistake, latestAttemptId: undefined }
            : mistake,
        ),
        sessions: currentSession
          ? abandonPracticeSession(current.sessions, currentSession.id)
          : current.sessions,
      }
    })
  }

  function clearCurrentBankMistakes() {
    if (
      !selectedBank ||
      !window.confirm('将清空当前题库的全部错题记录，是否继续？')
    ) {
      return
    }

    setData((current) => {
      const currentSession = getActivePracticeSession(
        current.sessions,
        selectedBank.id,
      )
      const sessions =
        currentSession?.settings.source === 'mistakes'
          ? abandonPracticeSession(current.sessions, currentSession.id)
          : current.sessions

      return {
        ...current,
        mistakes: current.mistakes.filter(
          (mistake) => mistake.bankId !== selectedBank.id,
        ),
        sessions,
      }
    })
  }

  function clearCurrentBankData() {
    if (
      !selectedBank ||
      !window.confirm(
        `将清空“${selectedBank.name}”的作答、错题、练习会话记录和练习设置，不会影响其他题库。是否继续？`,
      )
    ) {
      return
    }

    setData((current) => {
      const practiceSettings = { ...current.practiceSettings }
      delete practiceSettings[selectedBank.id]

      return {
        ...current,
        attempts: current.attempts.filter(
          (attempt) => attempt.bankId !== selectedBank.id,
        ),
        mistakes: current.mistakes.filter(
          (mistake) => mistake.bankId !== selectedBank.id,
        ),
        sessions: current.sessions.filter(
          (session) => session.bankId !== selectedBank.id,
        ),
        practiceSettings,
      }
    })
  }

  function clearAllLocalData() {
    if (
      !window.confirm(
        '将清空所有题库的练习、错题、设置和外观偏好。此操作只应在题库大厅执行，是否继续？',
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

  function updateAnswerSubmissionMode(mode: AnswerSubmissionMode) {
    setData((current) => ({
      ...current,
      answerSubmissionMode: mode,
    }))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <button
            className="brand-button"
            type="button"
            onClick={returnToLobby}
          >
            QuizNest
          </button>
          <span>本地刷题工具</span>
        </div>
        <div className="header-context">
          <span className="local-status" aria-hidden="true" />
          {selectedBank ? selectedBank.name : '数据保存在当前浏览器'}
        </div>
        <button
          className="theme-button"
          type="button"
          onClick={toggleTheme}
          aria-label="切换浅色或深色模式"
        >
          <span className="theme-swatch" aria-hidden="true" />
          外观：{data.theme === 'light' ? '浅色' : '深色'}
        </button>
      </header>

      <main
        className={`app-content ${
          selectedBank && view !== 'practice' ? 'workspace-content' : ''
        }`}
      >
        {view === 'lobby' && (
          <BankLobby
            items={lobbyItems}
            hasLocalData={hasLocalData}
            onSelectBank={openBank}
            onClearAllData={clearAllLocalData}
          />
        )}

        {(view === 'bank-home' || view === 'mistakes') &&
          selectedBank &&
          statistics && (
            <BankWorkspace
              bank={selectedBank}
              statistics={statistics}
              activeSection={
                view === 'mistakes' ? 'mistakes' : bankSection
              }
              onBack={returnToLobby}
              onNavigate={navigateWorkspace}
            >
              {view === 'bank-home' ? (
                <BankHome
                  section={bankSection}
                  bank={selectedBank}
                  questions={selectedQuestions}
                  statistics={statistics}
                  settings={practiceSettings}
                  availableQuestionCount={availableQuestions.length}
                  activeSession={activeSession}
                  onSettingsChange={updatePracticeSettings}
                  onStartPractice={() => startPractice()}
                  onContinuePractice={() => setView('practice')}
                  onOpenPractice={() => navigateWorkspace('practice')}
                  onOpenMistakes={() => navigateWorkspace('mistakes')}
                  onResetPractice={resetCurrentBankPractice}
                  onClearMistakes={clearCurrentBankMistakes}
                  onClearCurrentBankData={clearCurrentBankData}
                />
              ) : (
                <MistakePage
                  bank={selectedBank}
                  questions={selectedQuestions}
                  mistakes={bankMistakes}
                  onBack={() => navigateWorkspace('overview')}
                  onStartReview={startMistakeReview}
                />
              )}
            </BankWorkspace>
        )}

        {view === 'practice' &&
          selectedBank &&
          activeSession && (
            <PracticePage
              bank={selectedBank}
              questions={sessionQuestions}
              session={activeSession}
              mistakes={bankMistakes}
              submissionMode={data.answerSubmissionMode}
              onExit={() => setView('bank-home')}
              onSubmissionModeChange={updateAnswerSubmissionMode}
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
