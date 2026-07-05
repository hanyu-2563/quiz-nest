import { useEffect, useState } from 'react'
import {
  createDefaultLocalData,
  loadLocalData,
  removeLocalData,
  saveLocalData,
} from '../utils/storage'
import type { QuizNestLocalData } from '../utils/storage'

export function useLocalStorage() {
  const [data, setData] = useState<QuizNestLocalData>(loadLocalData)

  useEffect(() => {
    saveLocalData(data)
  }, [data])

  function clearData() {
    removeLocalData()
    setData(createDefaultLocalData())
  }

  return { data, setData, clearData }
}
