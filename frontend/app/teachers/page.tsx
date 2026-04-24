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
import type { Teacher } from '@/lib/types'
import { Grid3X3, Loader2, Trash2 } from 'lucide-react'

function slotCount(availability: string): number {
  try {
    return (JSON.parse(availability) as boolean[][]).flat().filter(Boolean).length
  } catch {
    return 0
  }
}

function SlotBadge({ count }: { count: number }) {
  const color =
    count < 20
      ? { bg: '#fee2e2', text: '#991b1b' }
      : count < 32
        ? { bg: '#fef9c3', text: '#854d0e' }
        : { bg: '#dcfce7', text: '#166534' }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {count}/40 slot
    </span>
  )
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [editAvail, setEditAvail] = useState<boolean[][]>([])
  const [saving, setSaving] = useState(false)

  function load() {
    api.teachers
      .list()
      .then(setTeachers)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
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
                  <SlotBadge count={slotCount(t.availability)} />
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
          <AvailabilityGrid value={editAvail} onChange={setEditAvail} />
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
