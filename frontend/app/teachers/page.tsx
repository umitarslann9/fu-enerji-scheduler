'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AvailabilityGrid } from '@/components/availability-grid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Schedule, Teacher } from '@/lib/types'
import { Grid3X3, Loader2, Trash2 } from 'lucide-react'

function freeSlotCount(availability: string, scheduledSlots: Set<string>): number {
  try {
    const avail = JSON.parse(availability) as boolean[][]
    return avail.flat().filter((v, i) => {
      const day = Math.floor(i / 8)
      const period = i % 8
      return v && !scheduledSlots.has(`${day},${period}`)
    }).length
  } catch {
    return 0
  }
}

function SlotBadge({ count }: { count: number }) {
  return (
    <span className="tabular-nums text-sm font-medium text-foreground">
      {count}
    </span>
  )
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [editAvail, setEditAvail] = useState<boolean[][]>([])
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([api.teachers.list(), api.schedule.latest()])
      .then(([tchs, sched]) => {
        setTeachers(tchs)
        setSchedule(sched)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  function scheduledSlotsFor(teacherId: number): Set<string> {
    if (!schedule?.lessons) return new Set()
    return new Set(
      schedule.lessons
        .filter((l) => l.teacher_id === teacherId)
        .map((l) => `${l.day},${l.period}`)
    )
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api.teachers.create(newName.trim())
      toast.success(`${newName.trim()} eklendi.`)
      setNewName('')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(t: Teacher) {
    try {
      await api.teachers.delete(t.id)
      toast.success(`${t.name} silindi.`)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    }
  }

  function openAvailability(t: Teacher) {
    setEditTeacher(t)
    setEditAvail(JSON.parse(t.availability) as boolean[][])
  }

  async function handleSaveAvailability() {
    if (!editTeacher) return
    setSaving(true)
    try {
      await api.teachers.update(editTeacher.id, { availability: JSON.stringify(editAvail) })
      toast.success('Müsaitlik kaydedildi.')
      setEditTeacher(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Öğretmenler</h1>

      <form onSubmit={handleAdd} className="flex max-w-sm gap-2">
        <Input
          placeholder="Öğretmen adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={adding}
        />
        <Button type="submit" disabled={adding || !newName.trim()}>
          {adding && <Loader2 className="mr-1 size-3 animate-spin" />}
          Ekle
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz öğretmen eklenmedi.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İsim</TableHead>
              <TableHead>Müsaitlik</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <SlotBadge count={freeSlotCount(t.availability, scheduledSlotsFor(t.id))} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openAvailability(t)}
                      title="Müsaitliği Düzenle"
                    >
                      <Grid3X3 />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(t)}
                      title="Sil"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editTeacher} onOpenChange={(open) => !open && setEditTeacher(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTeacher?.name} — Müsaitlik</DialogTitle>
          </DialogHeader>
          <AvailabilityGrid
            value={editAvail}
            onChange={setEditAvail}
            scheduledSlots={editTeacher ? scheduledSlotsFor(editTeacher.id) : undefined}
          />
          <DialogFooter>
            <Button onClick={handleSaveAvailability} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
