import { BankCard } from '../components/BankCard'
import type { QuestionBank } from '../types/quiz'

export interface BankLobbyProps {
  banks: QuestionBank[]
  onSelectBank: (bankId: string) => void
}

export function BankLobby({ banks, onSelectBank }: BankLobbyProps) {
  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">题库大厅</p>
        <h1>选择一个题库</h1>
        <p>先进入题库，再开始刷题或查看该题库的内容。</p>
      </div>

      <div className="bank-grid">
        {banks.map((bank) => (
          <BankCard key={bank.id} bank={bank} onSelect={onSelectBank} />
        ))}
      </div>
    </section>
  )
}
