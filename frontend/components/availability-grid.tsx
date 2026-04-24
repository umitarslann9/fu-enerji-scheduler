'use client'

import { cn } from '@/lib/utils'

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']

interface Props {
  value: boolean[][]
  onChange?: (value: boolean[][]) => void
  readOnly?: boolean
}

export function AvailabilityGrid({ value, onChange, readOnly }: Props) {
  function toggle(day: number, period: number) {
    if (readOnly || !onChange) return
    onChange(value.map((row, d) =>
      row.map((cell, p) => (d === day && p === period ? !cell : cell))
    ))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-8 pb-1" />
            {DAYS.map((d) => (
              <th key={d} className="w-10 pb-1 text-center font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, period) => (
            <tr key={period}>
              <td className="pr-2 text-right text-muted-foreground">{period + 1}.</td>
              {Array.from({ length: 5 }, (_, day) => {
                const checked = value[day]?.[period] ?? false
                return (
                  <td key={day} className="p-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(day, period)}
                      disabled={readOnly}
                      className={cn(
                        'size-7 rounded border transition-colors',
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:bg-muted',
                        readOnly && 'cursor-default'
                      )}
                      aria-label={`${DAYS[day]} ${period + 1}. ders ${checked ? 'müsait' : 'müsait değil'}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
