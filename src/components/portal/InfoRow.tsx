'use client'

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div className='flex items-start gap-2'><span className='text-xs text-[#9CA3AF] w-20 shrink-0 pt-0.5'>{label}</span><span className='text-sm text-[#111827]'>{value}</span></div>
}
