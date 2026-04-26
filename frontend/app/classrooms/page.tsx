'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import type { Classroom } from '@/lib/types'
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Yeni sınıf ekleme
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [studentCount, setStudentCount] = useState('')
  const [adding, setAdding] = useState(false)

  // Düzenleme dialogu
  const [editClassroom, setEditClassroom] = useState<Classroom | null>(null)
  const [editGrade, setEditGrade] = useState('')
  const [editSection, setEditSection] = useState('')
  const [editStudentCount, setEditStudentCount] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    api.classrooms
      .list()
      .then(setClassrooms)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setGrade('')
    setSection('')
    setStudentCount('')
    setShowForm(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const g = parseInt(grade)
    const sc = parseInt(studentCount)
    if (!section.trim() || isNaN(g) || g < 1 || g > 12 || isNaN(sc) || sc < 0) return
    setAdding(true)
    try {
      await api.classrooms.create(g, section.trim().toUpperCase(), sc)
      toast.success(`${g}-${section.trim().toUpperCase()} eklendi.`)
      resetForm()
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setAdding(false)
    }
  }

  function openEdit(c: Classroom) {
    setEditClassroom(c)
    setEditGrade(String(c.grade))
    setEditSection(c.section)
    setEditStudentCount(String(c.student_count))
  }

  async function handleSave() {
    if (!editClassroom) return
    const g = parseInt(editGrade)
    const sc = parseInt(editStudentCount)
    if (!editSection.trim() || isNaN(g) || g < 1 || g > 12 || isNaN(sc) || sc < 0) return
    setSaving(true)
    try {
      await api.classrooms.update(editClassroom.id, {
        grade: g,
        section: editSection.trim().toUpperCase(),
        student_count: sc,
      })
      toast.success('Kaydedildi.')
      setEditClassroom(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Classroom) {
    if (!window.confirm(`"${c.name}" sınıfını silmek istediğinizden emin misiniz? Bu sınıfa bağlı ders atamaları da kaldırılır.`)) return
    try {
      await api.classrooms.delete(c.id)
      toast.success(`${c.name} silindi.`)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    }
  }

  const canAdd =
    !adding &&
    section.trim().length > 0 &&
    parseInt(grade) >= 1 &&
    parseInt(grade) <= 12 &&
    parseInt(studentCount) >= 0 &&
    !isNaN(parseInt(studentCount))

  const canSave =
    !saving &&
    editSection.trim().length > 0 &&
    parseInt(editGrade) >= 1 &&
    parseInt(editGrade) <= 12 &&
    parseInt(editStudentCount) >= 0 &&
    !isNaN(parseInt(editStudentCount))

  const filtered = classrooms.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      String(c.grade).includes(q) ||
      c.section.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sınıflar</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 size-3" />
            Sınıf Ekle
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="max-w-md space-y-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Yeni Sınıf</h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetForm}>
              <X />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cls-grade">Sınıf (1-12)</Label>
              <Input
                id="cls-grade"
                placeholder="9"
                type="number"
                min={1}
                max={12}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                disabled={adding}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cls-section">Şube</Label>
              <Input
                id="cls-section"
                placeholder="A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={adding}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cls-students">Öğrenci</Label>
              <Input
                id="cls-students"
                placeholder="30"
                type="number"
                min={0}
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                disabled={adding}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={!canAdd}>
              {adding && <Loader2 className="mr-1 size-3 animate-spin" />}
              Ekle
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              İptal
            </Button>
          </div>
        </form>
      )}

      {!loading && classrooms.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sınıf veya şubeye göre ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : classrooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz sınıf eklenmedi.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">"{search}" için sonuç bulunamadı.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sınıf</TableHead>
              <TableHead>Şube</TableHead>
              <TableHead>Öğrenci</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.grade}. sınıf</TableCell>
                <TableCell>{c.section}</TableCell>
                <TableCell className="tabular-nums">{c.student_count}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEdit(c)}
                      title="Düzenle"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(c)}
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

      <Dialog open={!!editClassroom} onOpenChange={(open) => !open && setEditClassroom(null)}>
        <DialogContent className="sm:max-w-xs" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Sınıfı Düzenle — {editClassroom?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-grade">Sınıf (1-12)</Label>
              <Input
                id="edit-grade"
                type="number"
                min={1}
                max={12}
                value={editGrade}
                onChange={(e) => setEditGrade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-section">Şube</Label>
              <Input
                id="edit-section"
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
                placeholder="A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-students">Öğrenci Sayısı</Label>
              <Input
                id="edit-students"
                type="number"
                min={0}
                value={editStudentCount}
                onChange={(e) => setEditStudentCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!canSave}>
              {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
