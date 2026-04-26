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
                          'size-7 rounded border transition-colors duration-150',
                          isOnLeave
                            ? 'cursor-default border-border bg-muted/40 opacity-40'
                            : scheduled
                              ? 'cursor-default border-red-400 bg-red-100 dark:border-red-700 dark:bg-red-900/40'
                              : checked
                                ? 'border-emerald-500 bg-emerald-100 hover:bg-emerald-200 dark:border-emerald-600 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60'
                                : 'border-border bg-background hover:bg-muted dark:bg-muted/20',
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
            <span className="inline-block size-3 rounded border border-emerald-500 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/40" />
            Müsait
          </span>
        )}
        {hasScheduled && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded border border-red-400 bg-red-100 dark:border-red-700 dark:bg-red-900/40" />
            Programda dolu
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded border border-border bg-background opacity-60 dark:bg-muted/20" />
          {isOnLeave ? 'İzinli — tüm slotlar devre dışı' : 'Müsait değil'}
        </span>
      </div>
    </div>
  )
}
