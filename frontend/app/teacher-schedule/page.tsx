'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Lesson, Schedule, Teacher } from '@/lib/types'
import { FileDown, Loader2 } from 'lucide-react'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

type Color = { bg: string; border: string }

function buildColorMap(lessons: Lesson[]): Map<number, Color> {
  const ids = [...new Set(lessons.map((l) => l.classroom_id))]
  const map = new Map<number, Color>()
  ids.forEach((id, i) => {
    const hue = Math.round((i * 137.508) % 360)
    map.set(id, {
      bg: `hsl(${hue} 68% 91%)`,
      border: `hsl(${hue} 52% 65%)`,
    })
  })
  return map
}

type Grid = (Lesson | null)[][]

function buildGrid(lessons: Lesson[], teacherId: number): Grid {
  const grid: Grid = Array.from({ length: 8 }, () => Array(5).fill(null))
  lessons
    .filter((l) => l.teacher_id === teacherId)
    .forEach((l) => {
      grid[l.period][l.day] = l
    })
  return grid
}

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTeacherId, setActiveTeacherId] = useState<string>('')

  function load() {
    Promise.all([api.schedule.latest(), api.teachers.list()])
      .then(([sched, tchs]) => {
        setSchedule(sched)
        setTeachers(tchs)
        setActiveTeacherId('')
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const scheduledTeacherIds = schedule
    ? [...new Set(schedule.lessons.map((l) => l.teacher_id))]
    : []
  const scheduledTeachers = teachers
    .filter((t) => scheduledTeacherIds.includes(t.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  const colorMap = schedule ? buildColorMap(schedule.lessons) : new Map<number, Color>()
  const effectiveId = activeTeacherId || (scheduledTeachers[0] ? String(scheduledTeachers[0].id) : '')

  function handleDownloadPdf() {
    const teacher = scheduledTeachers.find((t) => String(t.id) === effectiveId)
    if (!teacher || !schedule) return
    const grid = buildGrid(schedule.lessons, teacher.id)

    const dayHeaders = DAYS.map(
      (d) => `<th style="border:1px solid #d1d5db;padding:8px 12px;background:#f9fafb;font-weight:600">${d}</th>`
    ).join('')

    const rows = Array.from({ length: 8 }, (_, period) => {
      const cells = Array.from({ length: 5 }, (_, day) => {
        const lesson = grid[period][day]
        return lesson
          ? `<td style="border:1px solid #d1d5db;padding:8px;vertical-align:top">
               <div style="font-weight:600;font-size:12px;line-height:1.3">${lesson.classroom_name}</div>
               <div style="font-size:10px;color:#6b7280;margin-top:2px">${lesson.subject_name}</div>
             </td>`
          : `<td style="border:1px solid #d1d5db;padding:8px;"></td>`
      }).join('')
      return `<tr>
        <td style="border:1px solid #d1d5db;padding:8px;text-align:center;background:#f9fafb;font-weight:500;color:#374151">${period + 1}</td>
        ${cells}
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${teacher.name} Ders Programı</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 32px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p  { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${teacher.name} — Ders Programı</h1>
<p>Fu Enerji Scheduler · ${new Date().toLocaleDateString('tr-TR')}</p>
<table>
  <thead>
    <tr>
      <th style="border:1px solid #d1d5db;padding:8px 12px;background:#f9fafb;width:40px"></th>
      ${dayHeaders}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = function() { window.print() }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Popup engelleyici PDF açılmasını engelledi. İzin verip tekrar deneyin.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Öğretmen Programı</h1>
          {schedule && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date(schedule.generated_at).toLocaleString('tr-TR')} —{' '}
              <span className={schedule.is_feasible ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-600 dark:text-red-400'}>
                {schedule.is_feasible ? 'Geçerli' : 'Çözüm Bulunamadı'}
              </span>
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : !schedule ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Henüz program oluşturulmadı. "Program" sekmesinden oluşturun.
          </p>
        </div>
      ) : !schedule.is_feasible ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Geçerli program bulunamadı</p>
          <p className="mt-1 text-sm text-muted-foreground">{schedule.message}</p>
        </div>
      ) : scheduledTeachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Program oluşturuldu ama gösterilecek öğretmen yok.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Öğretmen:</span>
            <Select value={effectiveId} onValueChange={setActiveTeacherId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scheduledTeachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} title="PDF olarak indir">
              <FileDown className="mr-1.5 size-4" />
              PDF
            </Button>
          </div>

          {(() => {
            const teacher = scheduledTeachers.find((t) => String(t.id) === effectiveId)
            if (!teacher) return null
            const grid = buildGrid(schedule.lessons, teacher.id)
            return (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="w-12 border-b border-r border-border bg-muted/60 py-2.5 text-center text-xs font-semibold text-muted-foreground" />
                      {DAYS.map((d) => (
                        <th
                          key={d}
                          className="border-b border-r border-border bg-muted/60 px-3 py-2.5 text-center text-xs font-semibold tracking-wide text-muted-foreground last:border-r-0"
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }, (_, period) => (
                      <tr key={period} className="border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-muted/20">
                        <td className="border-r border-border bg-muted/40 py-3 text-center text-xs font-semibold text-muted-foreground">
                          {period + 1}
                        </td>
                        {Array.from({ length: 5 }, (_, day) => {
                          const lesson = grid[period][day]
                          const color = lesson ? colorMap.get(lesson.classroom_id) ?? null : null
                          return (
                            <td
                              key={day}
                              className="border-r border-border p-1.5 align-top last:border-r-0"
                              style={{
                                minWidth: 100,
                                height: 64,
                              }}
                            >
                              {lesson && (
                                <div
                                  className="h-full rounded-lg px-2 py-1.5 text-xs transition-all duration-150 hover:brightness-95"
                                  style={{
                                    border: `1px solid ${color!.border}`,
                                    backgroundColor: color!.bg,
                                  }}
                                >
                                  <p className="font-semibold leading-tight text-zinc-800">{lesson.classroom_name}</p>
                                  <p className="mt-0.5 text-[10px] leading-tight text-zinc-600">
                                    {lesson.subject_name}
                                  </p>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
