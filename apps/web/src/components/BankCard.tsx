import type { QuestionBank } from '../types/quiz'

export interface BankCardProps {
  bank: QuestionBank
}

export function BankCard({ bank }: BankCardProps) {
  return (
    <article>
      <h2>{bank.name}</h2>
      <p>{bank.description}</p>
    </article>
  )
}
