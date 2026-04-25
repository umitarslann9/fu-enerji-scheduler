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
import { Label } from '@/components/ui/label'
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
import { Grid3X3, Loader2, Pencil, Search, Trash2 } from 'lucide-react'

function slotCounts(availability: string, scheduledSlots: Set<string>): { free: number; total: number } {
  try {
    const avail = JSON.parse(availability) as boolean[][]
    let free = 0
    let total = 0
    avail.flat().forEach((v, i) => {
      const day = Math.floor(i / 8)
      const period = i % 8
      if (v) {
        total++
        if (!scheduledSlots.has(`${day},${period}`)) free++
      }
    })
    return { free, total }
  } catch {
    return { free: 0, total: 0 }
  }
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Yeni öğretmen ekleme
  const [newName, setNewName] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [adding, setAdding] = useState(false)

  // Ad / branş düzenleme dialogu
  const [editInfoTeacher, setEditInfoTeacher] = useState<Teacher | null>(null)
  const [editName, setEditName] = useState('')
  const [editBranch, setEditBranch] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Müsaitlik grid dialogu
  const [editAvailTeacher, setEditAvailTeacher] = useState<Teacher | null>(null)
  const [editAvail, setEditAvail] = useState<boolean[][]>([])
  const [savingAvail, setSavingAvail] = useState(false)

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

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newBranch.trim()) return
    setAdding(true)
    try {
      await api.teachers.create(newName.trim(), newBranch.trim())
      toast.success(`${newName.trim()} eklendi.`)
      setNewName('')
      setNewBranch('')
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

  function openEditInfo(t: Teacher) {
    setEditInfoTeacher(t)
    setEditName(t.name)
    setEditBranch(t.branch)
  }

  async function handleSaveInfo() {
    if (!editInfoTeacher || !editName.trim() || !editBranch.trim()) return
    setSavingInfo(true)
    try {
      await api.teachers.update(editInfoTeacher.id, {
        name: editName.trim(),
        branch: editBranch.trim(),
      })
      toast.success('Kaydedildi.')
      setEditInfoTeacher(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSavingInfo(false)
    }
  }

  function openEditAvail(t: Teacher) {
    setEditAvailTeacher(t)
    try {
      setEditAvail(JSON.parse(t.availability) as boolean[][])
    } catch {
      setEditAvail(Array.from({ length: 5 }, () => Array(8).fill(true)))
    }
  }

  async function handleSaveAvail() {
    if (!editAvailTeacher) return
    setSavingAvail(true)
    try {
      await api.teachers.update(editAvailTeacher.id, {
        availability: JSON.stringify(editAvail),
      })
      toast.success('Müsaitlik kaydedildi.')
      setEditAvailTeacher(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSavingAvail(false)
    }
  }

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.branch.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Öğretmenler</h1>

      {/* Yeni öğretmen formu */}
      <form onSubmit={handleAdd} className="flex max-w-lg gap-2">
        <Input
          placeholder="Öğretmen adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={adding}
          className="flex-1"
        />
        <Input
          placeholder="Branş"
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          disabled={adding}
          className="w-36"
        />
        <Button type="submit" disabled={adding || !newName.trim() || !newBranch.trim()}>
          {adding && <Loader2 className="mr-1 size-3 animate-spin" />}
          Ekle
        </Button>
      </form>

      {/* Arama */}
      {!loading && teachers.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İsim veya branşa göre ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz öğretmen eklenmedi.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          "{search}" için sonuç bulunamadı.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İsim</TableHead>
              <TableHead>Branş</TableHead>
              <TableHead>Boş Saat</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.branch || '—'}</TableCell>
                <TableCell>
                  {(() => {
                    const { free, total } = slotCounts(t.availability, scheduledSlotsFor(t.id))
                    return (
                      <span className="tabular-nums text-sm" title="Müsait ve programlanmamış ders saati sayısı">
                        <span className="font-medium">{free}</span>
                        <span className="text-muted-foreground">/{total}</span>
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEditInfo(t)}
                      title="Ad / Branş Düzenle"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEditAvail(t)}
                      title="Müsaitlik Düzenle"
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

      {/* Ad / Branş düzenleme dialogu */}
      <Dialog open={!!editInfoTeacher} onOpenChange={(open) => !open && setEditInfoTeacher(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Öğretmeni Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="info-name">İsim</Label>
              <Input
                id="info-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Öğretmen adı"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="info-branch">Branş</Label>
              <Input
                id="info-branch"
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                placeholder="Matematik"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveInfo}
              disabled={savingInfo || !editName.trim() || !editBranch.trim()}
            >
              {savingInfo && <Loader2 className="mr-1 size-3 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Müsaitlik grid dialogu */}
      <Dialog open={!!editAvailTeacher} onOpenChange={(open) => !open && setEditAvailTeacher(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editAvailTeacher?.name} — Müsaitlik</DialogTitle>
          </DialogHeader>
          <AvailabilityGrid
            value={editAvail}
            onChange={setEditAvail}
            scheduledSlots={editAvailTeacher ? scheduledSlotsFor(editAvailTeacher.id) : undefined}
          />
          <DialogFooter>
            <Button onClick={handleSaveAvail} disabled={savingAvail}>
              {savingAvail && <Loader2 className="mr-1 size-3 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
