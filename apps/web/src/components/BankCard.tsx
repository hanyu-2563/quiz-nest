import type { QuestionBank } from '../types/quiz'

export interface BankCardProps {
  bank: QuestionBank
  onSelect: (bankId: string) => void
}

export function BankCard({ bank, onSelect }: BankCardProps) {
  return (
    <article className="bank-card">
      <h2>{bank.name}</h2>
      <p>{bank.description}</p>
      <p className="bank-card-meta">共 {bank.questionCount} 道题</p>
      <button type="button" onClick={() => onSelect(bank.id)}>
        进入题库
      </button>
    </article>
  )
}
