'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { Schedule } from '@/lib/types'
import { BookOpen, Calendar, School, Users } from 'lucide-react'

export default function DashboardPage() {
  const [counts, setCounts] = useState({ teachers: 0, classrooms: 0, subjects: 0 })
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.teachers.list(),
      api.classrooms.list(),
      api.subjects.list(),
      api.schedule.latest(),
    ])
      .then(([teachers, classrooms, subjects, sched]) => {
        setCounts({
          teachers: teachers.length,
          classrooms: classrooms.length,
          subjects: subjects.length,
        })
        setSchedule(sched)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Öğretmen', value: counts.teachers, icon: Users },
    { label: 'Sınıf', value: counts.classrooms, icon: School },
    { label: 'Ders', value: counts.subjects, icon: BookOpen },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? '…' : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4" />
            Son Program
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {loading ? (
            <p className="text-muted-foreground">Yükleniyor…</p>
          ) : !schedule ? (
            <p className="text-muted-foreground">Henüz program oluşturulmadı.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-2 rounded-full"
                  style={{ backgroundColor: schedule.is_feasible ? '#22c55e' : '#ef4444' }}
                />
                <span className="font-medium">
                  {schedule.is_feasible ? 'Geçerli Program' : 'Çözüm Bulunamadı'}
                </span>
              </div>
              {schedule.is_feasible && (
                <p className="text-muted-foreground">{schedule.lessons.length} ders saati atandı</p>
              )}
              {!schedule.is_feasible && schedule.message && (
                <p className="text-muted-foreground">{schedule.message}</p>
              )}
              <p className="text-muted-foreground">
                {new Date(schedule.generated_at).toLocaleString('tr-TR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
