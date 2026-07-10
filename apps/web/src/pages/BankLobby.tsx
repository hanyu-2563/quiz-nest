import { BankCard } from '../components/BankCard'
import type {
  BankStatistics,
  PracticeSession,
  QuestionBank,
} from '../types/quiz'

export interface LobbyBankItem {
  bank: QuestionBank
  statistics: BankStatistics
  activeSession?: PracticeSession
}

export interface BankLobbyProps {
  items: LobbyBankItem[]
  hasLocalData: boolean
  onSelectBank: (bankId: string) => void
  onClearAllData: () => void
}

export function BankLobby({
  items,
  hasLocalData,
  onSelectBank,
  onClearAllData,
}: BankLobbyProps) {
  const totalQuestions = items.reduce(
    (total, item) => total + item.statistics.totalQuestions,
    0,
  )
  const practicedQuestions = items.reduce(
    (total, item) => total + item.statistics.practicedQuestions,
    0,
  )

  return (
    <section className="page lobby-page">
      <div className="lobby-heading">
        <div>
          <p className="eyebrow">题库大厅</p>
          <h1>我的题库</h1>
          <p>选择题库进入工作区，继续练习或整理错题。</p>
        </div>
        <dl className="lobby-summary" aria-label="题库总览">
          <div>
            <dt>题库</dt>
            <dd>{items.length}</dd>
          </div>
          <div>
            <dt>总题数</dt>
            <dd>{totalQuestions}</dd>
          </div>
          <div>
            <dt>已练习</dt>
            <dd>{practicedQuestions}</dd>
          </div>
        </dl>
      </div>

      <div className="bank-grid">
        {items.map(({ bank, statistics, activeSession }) => (
          <BankCard
            key={bank.id}
            bank={bank}
            statistics={statistics}
            activeSession={activeSession}
            onSelect={onSelectBank}
          />
        ))}
      </div>

      <section className="global-data-panel">
        <div>
          <span className="panel-kicker">全局数据</span>
          <h2>当前浏览器中的 QuizNest 数据</h2>
          <p>这里的操作会影响所有题库，并同时恢复默认外观设置。</p>
        </div>
        <button
          className="danger-button"
          type="button"
          disabled={!hasLocalData}
          onClick={onClearAllData}
        >
          清空全部本地数据
        </button>
      </section>
    </section>
  )
}
