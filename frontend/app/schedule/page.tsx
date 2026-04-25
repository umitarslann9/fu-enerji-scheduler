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
import type { Classroom, Lesson, Schedule } from '@/lib/types'
import { FileDown, Loader2, RefreshCw } from 'lucide-react'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

const PALETTE = [
  { bg: 'hsl(214 100% 93%)', border: 'hsl(214 80% 78%)' },
  { bg: 'hsl(142 60% 90%)', border: 'hsl(142 50% 63%)' },
  { bg: 'hsl(280 60% 92%)', border: 'hsl(280 50% 72%)' },
  { bg: 'hsl(38 90% 90%)', border: 'hsl(38 80% 63%)' },
  { bg: 'hsl(330 70% 92%)', border: 'hsl(330 60% 72%)' },
  { bg: 'hsl(174 60% 88%)', border: 'hsl(174 55% 52%)' },
  { bg: 'hsl(20 90% 92%)', border: 'hsl(20 80% 66%)' },
  { bg: 'hsl(0 70% 92%)', border: 'hsl(0 65% 68%)' },
]

function buildColorMap(lessons: Lesson[]): Map<number, typeof PALETTE[0]> {
  const ids = [...new Set(lessons.map((l) => l.subject_id))]
  const map = new Map<number, typeof PALETTE[0]>()
  ids.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]))
  return map
}

type Grid = (Lesson | null)[][]

function buildGrid(lessons: Lesson[], classroomId: number): Grid {
  const grid: Grid = Array.from({ length: 8 }, () => Array(5).fill(null))
  lessons
    .filter((l) => l.classroom_id === classroomId)
    .forEach((l) => {
      grid[l.period][l.day] = l
    })
  return grid
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeClassroomId, setActiveClassroomId] = useState<string>('')

  function load() {
    Promise.all([api.schedule.latest(), api.classrooms.list()])
      .then(([sched, clss]) => {
        setSchedule(sched)
        setClassrooms(clss)
        setActiveClassroomId('')
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const sched = await api.schedule.generate()
      setSchedule(sched)
      setActiveClassroomId('')
      if (sched.is_feasible) {
        toast.success(`Program oluşturuldu — ${sched.lessons.length} ders saati atandı.`)
      } else {
        toast.error('Geçerli program bulunamadı. Kısıtları kontrol edin.')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setGenerating(false)
    }
  }

  function handleDownloadPdf() {
    const classroom = scheduledClassrooms.find((c) => String(c.id) === effectiveId)
    if (!classroom || !schedule) return
    const grid = buildGrid(schedule.lessons, classroom.id)

    const dayHeaders = DAYS.map(
      (d) => `<th style="border:1px solid #d1d5db;padding:8px 12px;background:#f9fafb;font-weight:600">${d}</th>`
    ).join('')

    const rows = Array.from({ length: 8 }, (_, period) => {
      const cells = Array.from({ length: 5 }, (_, day) => {
        const lesson = grid[period][day]
        return lesson
          ? `<td style="border:1px solid #d1d5db;padding:8px;vertical-align:top">
               <div style="font-weight:600;font-size:12px;line-height:1.3">${lesson.subject_name}</div>
               <div style="font-size:10px;color:#6b7280;margin-top:2px">${lesson.teacher_name}</div>
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
<title>${classroom.name} Ders Programı</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 32px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p  { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${classroom.name} Sınıfı — Ders Programı</h1>
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

  const scheduledClassroomIds = schedule
    ? [...new Set(schedule.lessons.map((l) => l.classroom_id))]
    : []
  const scheduledClassrooms = classrooms.filter((c) =>
    scheduledClassroomIds.includes(c.id)
  )
  const colorMap = schedule ? buildColorMap(schedule.lessons) : new Map<number, typeof PALETTE[0]>()
  const effectiveId = activeClassroomId || (scheduledClassrooms[0] ? String(scheduledClassrooms[0].id) : '')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ders Programı</h1>
          {schedule && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date(schedule.generated_at).toLocaleString('tr-TR')} —{' '}
              <span style={{ color: schedule.is_feasible ? '#16a34a' : '#dc2626' }}>
                {schedule.is_feasible ? 'Geçerli' : 'Çözüm Bulunamadı'}
              </span>
            </p>
          )}
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" /> Oluşturuluyor…
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 size-4" /> Program Oluştur
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : !schedule ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Henüz program oluşturulmadı. "Program Oluştur" butonuna basın.
          </p>
        </div>
      ) : !schedule.is_feasible ? (
        <div className="rounded-lg border p-4" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
            Geçerli program bulunamadı
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{schedule.message}</p>
        </div>
      ) : scheduledClassrooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Program oluşturuldu ama gösterilecek sınıf yok.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Sınıf:</span>
            <Select value={effectiveId} onValueChange={setActiveClassroomId}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scheduledClassrooms.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
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
            const classroom = scheduledClassrooms.find((c) => String(c.id) === effectiveId)
            if (!classroom) return null
            const grid = buildGrid(schedule.lessons, classroom.id)
            return (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="w-10 border-b border-r bg-muted p-2 text-center text-xs font-medium text-muted-foreground" />
                      {DAYS.map((d) => (
                        <th
                          key={d}
                          className="border-b border-r bg-muted p-2 text-center text-xs font-medium last:border-r-0"
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }, (_, period) => (
                      <tr key={period} className="border-b last:border-b-0">
                        <td className="border-r bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                          {period + 1}
                        </td>
                        {Array.from({ length: 5 }, (_, day) => {
                          const lesson = grid[period][day]
                          const color = lesson ? colorMap.get(lesson.subject_id) ?? null : null
                          return (
                            <td
                              key={day}
                              className="border-r p-1 align-top last:border-r-0"
                              style={{
                                backgroundColor: color?.bg ?? undefined,
                                minWidth: 90,
                                height: 56,
                              }}
                            >
                              {lesson && (
                                <div
                                  className="h-full rounded px-1.5 py-1 text-xs"
                                  style={{
                                    border: `1px solid ${color!.border}`,
                                    backgroundColor: color!.bg,
                                  }}
                                >
                                  <p className="font-medium leading-tight">
                                    {lesson.subject_name}
                                  </p>
                                  <p className="mt-0.5 leading-tight text-muted-foreground" style={{ fontSize: 10 }}>
                                    {lesson.teacher_name}
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
