'use client'

import React from 'react'

export function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="size-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
        <Icon className="size-7 text-[#9CA3AF]" />
      </div>
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      {description && <p className="text-sm text-[#9CA3AF] mt-1.5 text-center max-w-sm">{description}</p>}
    </div>
  )
}
