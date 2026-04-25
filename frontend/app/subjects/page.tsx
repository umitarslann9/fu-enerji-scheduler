'use client'

import { useEffect, useRef, useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Classroom, Subject, Teacher } from '@/lib/types'
import { ChevronDown, Info, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'

function ClassroomPicker({
  classrooms,
  selected,
  onChange,
}: {
  classrooms: Classroom[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id])
  }

  const triggerLabel =
    selected.length === 0
      ? 'Sınıf seç…'
      : selected.length === 1
      ? (classrooms.find((c) => c.id === selected[0])?.name ?? '1 sınıf')
      : `${selected.length} sınıf seçildi`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between rounded-lg border bg-background px-2.5 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={selected.length === 0 ? 'text-muted-foreground' : ''}>
          {triggerLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-44 overflow-y-auto divide-y">
            {classrooms.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                style={
                  selected.includes(c.id)
                    ? { backgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)' }
                    : {}
                }
              >
                <input
                  type="checkbox"
                  className="accent-primary shrink-0"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('3')
  const [teacherId, setTeacherId] = useState('')
  const [classroomIds, setClassroomIds] = useState<number[]>([])
  const [adding, setAdding] = useState(false)

  // Düzenleme dialogu
  const [editSubject, setEditSubject] = useState<Subject | null>(null)
  const [editName, setEditName] = useState('')
  const [editWeeklyHours, setEditWeeklyHours] = useState('3')
  const [editTeacherId, setEditTeacherId] = useState('')
  const [editClassroomIds, setEditClassroomIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([api.subjects.list(), api.teachers.list(), api.classrooms.list()])
      .then(([subs, tchs, clss]) => {
        setSubjects(subs)
        setTeachers(tchs)
        setClassrooms(clss)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setName('')
    setWeeklyHours('3')
    setTeacherId('')
    setClassroomIds([])
    setShowForm(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !teacherId) return
    setAdding(true)
    try {
      await api.subjects.create({
        name: name.trim(),
        weekly_hours: parseInt(weeklyHours),
        teacher_id: parseInt(teacherId),
        classroom_ids: classroomIds,
      })
      toast.success(`${name.trim()} eklendi.`)
      resetForm()
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(s: Subject) {
    try {
      await api.subjects.delete(s.id)
      toast.success(`${s.name} silindi.`)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    }
  }

  function openEdit(s: Subject) {
    setEditSubject(s)
    setEditName(s.name)
    setEditWeeklyHours(String(s.weekly_hours))
    setEditTeacherId(String(s.teacher_id))
    setEditClassroomIds([...s.classroom_ids])
  }

  async function handleSave() {
    if (!editSubject || !editName.trim() || !editTeacherId) return
    setSaving(true)
    try {
      await api.subjects.update(editSubject.id, {
        name: editName.trim(),
        weekly_hours: parseInt(editWeeklyHours),
        teacher_id: parseInt(editTeacherId),
        classroom_ids: editClassroomIds,
      })
      toast.success('Ders güncellendi.')
      if (parseInt(editWeeklyHours) !== editSubject.weekly_hours) {
        toast.warning('Ders saati değişti — mevcut program geçerliliğini yitirdi, lütfen yeniden oluşturun.')
      }
      setEditSubject(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]))
  const classroomMap = Object.fromEntries(classrooms.map((c) => [c.id, c.name]))

  // Branş eşleşmesine göre filtre — boşsa tüm öğretmenleri göster
  const addFilteredTeachers = name.trim()
    ? teachers.filter((t) => t.branch.toLowerCase() === name.trim().toLowerCase())
    : teachers
  const editFilteredTeachers = editName.trim()
    ? teachers.filter((t) => t.branch.toLowerCase() === editName.trim().toLowerCase())
    : teachers

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dersler</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 size-3" />
            Ders Ekle
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="max-w-md space-y-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Yeni Ders</h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetForm}>
              <X />
            </Button>
          </div>

          {/* Branş adı ↔ Öğretmen: paralel, birbirini filtreler */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subj-name">Branş / Ders adı</Label>
              <Input
                id="subj-name"
                placeholder="Matematik"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  const cur = teachers.find((t) => t.id === parseInt(teacherId))
                  if (cur && cur.branch.toLowerCase() !== e.target.value.toLowerCase()) {
                    setTeacherId('')
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subj-teacher">Öğretmen</Label>
              <Select
                value={teacherId}
                onValueChange={(value) => {
                  setTeacherId(value)
                  const t = teachers.find((t) => t.id === parseInt(value))
                  if (t?.branch) setName(t.branch)
                }}
              >
                <SelectTrigger id="subj-teacher">
                  <SelectValue placeholder="Seç…" />
                </SelectTrigger>
                <SelectContent>
                  {addFilteredTeachers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Bu branşta öğretmen yok</div>
                  ) : (
                    addFilteredTeachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-hours">Haftalık saat</Label>
            <Select value={weeklyHours} onValueChange={setWeeklyHours}>
              <SelectTrigger id="subj-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} saat
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sınıflar</Label>
            {classrooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">Önce sınıf ekleyin.</p>
            ) : (
              <ClassroomPicker
                classrooms={classrooms}
                selected={classroomIds}
                onChange={setClassroomIds}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={adding || !name.trim() || !teacherId}>
              {adding && <Loader2 className="mr-1 size-3 animate-spin" />}
              Ekle
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              İptal
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz ders eklenmedi.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ders</TableHead>
              <TableHead>Haftalık</TableHead>
              <TableHead>Öğretmen</TableHead>
              <TableHead>Sınıflar</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.weekly_hours} saat</TableCell>
                <TableCell>{teacherMap[s.teacher_id] ?? '—'}</TableCell>
                <TableCell>
                  {s.classroom_ids.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="relative inline-block group">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="size-3.5 shrink-0" />
                        <span>{s.classroom_ids.length} sınıf</span>
                      </button>
                      <div className="absolute left-0 top-full z-50 pt-1 hidden group-hover:block">
                        <ul className="min-w-[7rem] rounded-md border bg-popover py-1.5 shadow-md text-sm">
                          {s.classroom_ids.map((id) => (
                            <li key={id} className="px-3 py-0.5 whitespace-nowrap">
                              {classroomMap[id] ?? `#${id}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEdit(s)}
                      title="Düzenle"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(s)}
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

      {/* Düzenleme dialogu */}
      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dersi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Branş adı ↔ Öğretmen: paralel, birbirini filtreler */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-subj-name">Branş / Ders adı</Label>
                <Input
                  id="edit-subj-name"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value)
                    const cur = teachers.find((t) => t.id === parseInt(editTeacherId))
                    if (cur && cur.branch.toLowerCase() !== e.target.value.toLowerCase()) {
                      setEditTeacherId('')
                    }
                  }}
                  placeholder="Matematik"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-subj-teacher">Öğretmen</Label>
                <Select
                  value={editTeacherId}
                  onValueChange={(value) => {
                    setEditTeacherId(value)
                    const t = teachers.find((t) => t.id === parseInt(value))
                    if (t?.branch) setEditName(t.branch)
                  }}
                >
                  <SelectTrigger id="edit-subj-teacher">
                    <SelectValue placeholder="Seç…" />
                  </SelectTrigger>
                  <SelectContent>
                    {editFilteredTeachers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Bu branşta öğretmen yok</div>
                    ) : (
                      editFilteredTeachers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {editName.trim() && editFilteredTeachers.length === 0 && (
                  <p className="text-xs text-muted-foreground">Bu branşta öğretmen bulunamadı.</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-subj-hours">Haftalık saat</Label>
              <Select value={editWeeklyHours} onValueChange={setEditWeeklyHours}>
                <SelectTrigger id="edit-subj-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} saat
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editSubject && parseInt(editWeeklyHours) !== editSubject.weekly_hours && (
                <p className="text-xs text-amber-600">
                  Ders saati değişirse mevcut program geçerliliğini yitirir.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Sınıflar</Label>
              {classrooms.length === 0 ? (
                <p className="text-xs text-muted-foreground">Önce sınıf ekleyin.</p>
              ) : (
                <ClassroomPicker
                  classrooms={classrooms}
                  selected={editClassroomIds}
                  onChange={setEditClassroomIds}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={saving || !editName.trim() || !editTeacherId}
            >
              {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
