import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getTimeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
  
  if (diffInMinutes === 0) return "방금 전"
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`
  return `${Math.floor(diffInMinutes / 1440)}일 전`
}

export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case "고위험":
      return "text-red-600 bg-red-100"
    case "중위험":
      return "text-yellow-600 bg-yellow-100"
    case "저위험":
      return "text-green-600 bg-green-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}
