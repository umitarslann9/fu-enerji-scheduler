'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { Schedule } from '@/lib/types'
import { BookOpen, Calendar, Database, GraduationCap, Loader2, School, Users } from 'lucide-react'

export default function DashboardPage() {
  const [counts, setCounts] = useState({ teachers: 0, classrooms: 0, subjects: 0, students: 0 })
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  function load() {
    setLoading(true)
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
          students: classrooms.reduce((sum, c) => sum + (c.student_count ?? 0), 0),
        })
        setSchedule(sched)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSeed() {
    setSeedDialogOpen(false)
    setSeeding(true)
    try {
      const result = await api.seed.run()
      toast.success(
        `Demo veri yüklendi — ${result.classrooms} sınıf, ${result.teachers} öğretmen, ${result.subjects} ders.`
      )
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Seed hatası')
    } finally {
      setSeeding(false)
    }
  }

  const stats = [
    { label: 'Öğretmen', value: counts.teachers, icon: Users },
    { label: 'Sınıf', value: counts.classrooms, icon: School },
    { label: 'Ders', value: counts.subjects, icon: BookOpen },
    { label: 'Toplam Öğrenci', value: counts.students, icon: GraduationCap },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSeedDialogOpen(true)}
          disabled={seeding || loading}
        >
          {seeding ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              Yükleniyor…
            </>
          ) : (
            <>
              <Database className="mr-1.5 size-4" />
              Demo Veri Yükle
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Dialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Demo Veri Yükle</DialogTitle>
            <DialogDescription>
              Mevcut tüm öğretmen, sınıf, ders ve program kayıtları silinir; yerine 9-12. sınıf
              4 şube (A-D), 26 öğretmen ve haftada ~33 saatlik ders programı yüklenir.
              Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleSeed}>
              Evet, Yükle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
