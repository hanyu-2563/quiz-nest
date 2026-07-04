import { useState } from 'react'
import './App.css'
import { mockQuestionBanks, mockQuestions } from './data/mockData'
import { BankHome } from './pages/BankHome'
import { BankLobby } from './pages/BankLobby'
import { PracticePage } from './pages/PracticePage'

type View = 'lobby' | 'bank-home' | 'practice'

function App() {
  const [view, setView] = useState<View>('lobby')
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)

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

  function openBank(bankId: string) {
    setSelectedBankId(bankId)
    setView('bank-home')
  }

  function returnToLobby() {
    setSelectedBankId(null)
    setView('lobby')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={returnToLobby}>
          QuizNest
        </button>
        <span>先选择题库，再开始专注刷题。</span>
      </header>

      <main className="app-content">
        {view === 'lobby' && (
          <BankLobby banks={mockQuestionBanks} onSelectBank={openBank} />
        )}

        {view === 'bank-home' && selectedBank && (
          <BankHome
            bank={selectedBank}
            onBack={returnToLobby}
            onStartPractice={() => setView('practice')}
          />
        )}

        {view === 'practice' && selectedBank && (
          <PracticePage
            bank={selectedBank}
            questions={selectedQuestions}
            onExit={() => setView('bank-home')}
          />
        )}
      </main>
    </div>
  )
}

export default App
