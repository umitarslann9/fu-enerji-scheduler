'use client'

import { cn } from '@/lib/utils'

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']

interface Props {
  value: boolean[][]
  onChange?: (value: boolean[][]) => void
  readOnly?: boolean
  /** "gün,period" string'lerinden oluşan set — programda dolu slotları işaretler */
  scheduledSlots?: Set<string>
  isOnLeave?: boolean
}

export function AvailabilityGrid({ value, onChange, readOnly, scheduledSlots, isOnLeave }: Props) {
  function toggle(day: number, period: number) {
    if (readOnly || !onChange || isOnLeave) return
    if (scheduledSlots?.has(`${day},${period}`)) return
    onChange(value.map((row, d) =>
      row.map((cell, p) => (d === day && p === period ? !cell : cell))
    ))
  }

  const hasScheduled = !isOnLeave && scheduledSlots && scheduledSlots.size > 0

  return (
    <div className="space-y-3">
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
                  const checked = !isOnLeave && (value[day]?.[period] ?? false)
                  const scheduled = !isOnLeave && (scheduledSlots?.has(`${day},${period}`) ?? false)
                  return (
                    <td key={day} className="p-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(day, period)}
                        disabled={readOnly || scheduled || isOnLeave}
                        className={cn(
                          'size-7 rounded border transition-colors',
                          isOnLeave
                            ? 'border-gray-600 bg-gray-700 cursor-default opacity-50'
                            : scheduled
                              ? 'border-red-600 bg-red-500 cursor-default'
                              : checked
                                ? 'border-green-600 bg-green-500'
                                : 'border-gray-700 bg-gray-800 hover:bg-gray-700',
                          (readOnly || scheduled || isOnLeave) && 'cursor-default'
                        )}
                        aria-label={
                          isOnLeave
                            ? `${DAYS[day]} ${period + 1}. ders — izinli`
                            : scheduled
                              ? `${DAYS[day]} ${period + 1}. ders — programda dolu`
                              : `${DAYS[day]} ${period + 1}. ders ${checked ? 'müsait' : 'müsait değil'}`
                        }
                        title={isOnLeave ? 'İzinli' : scheduled ? 'Programda ders var' : checked ? 'Müsait' : 'Müsait değil'}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {!isOnLeave && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-green-600 bg-green-500" />
            Müsait
          </span>
        )}
        {hasScheduled && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-red-600 bg-red-500" />
            Programda dolu
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded border border-gray-700 bg-gray-800 opacity-50" />
          {isOnLeave ? 'İzinli — tüm slotlar devre dışı' : 'Müsait değil'}
        </span>
      </div>
    </div>
  )
}
