const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
}

export function formatDate(
  value: string | undefined,
  fallback: string,
  options: Intl.DateTimeFormatOptions = defaultDateTimeOptions,
): string {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat('zh-CN', options).format(date)
}