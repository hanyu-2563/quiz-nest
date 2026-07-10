import { useEffect, useRef, useState } from 'react'
import {
  createDefaultLocalData,
  loadLocalData,
  removeLocalData,
  saveLocalData,
} from '../utils/storage'
import type { QuizNestLocalData } from '../utils/storage'

export function useLocalStorage() {
  const [data, setData] = useState<QuizNestLocalData>(loadLocalData)
  const persistedData = useRef(data)

  useEffect(() => {
    if (data === persistedData.current) {
      return
    }

    if (saveLocalData(data)) {
      persistedData.current = data
    }
  }, [data])

  function clearData() {
    const emptyData = createDefaultLocalData()
    const removed = removeLocalData()

    if (removed || saveLocalData(emptyData)) {
      persistedData.current = emptyData
    }

    setData(emptyData)
  }

  return { data, setData, clearData }
}
