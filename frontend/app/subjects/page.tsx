'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Loader2, Plus, Trash2, X } from 'lucide-react'

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

  function toggleClassroom(id: number) {
    setClassroomIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]))
  const classroomMap = Object.fromEntries(classrooms.map((c) => [c.id, c.name]))

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

          <div className="space-y-1.5">
            <Label htmlFor="subj-name">Ders adı</Label>
            <Input
              id="subj-name"
              placeholder="Matematik"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-hours">Haftalık saat</Label>
            <Select value={weeklyHours} onValueChange={setWeeklyHours}>
              <SelectTrigger id="subj-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} saat
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subj-teacher">Öğretmen</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger id="subj-teacher">
                <SelectValue placeholder="Öğretmen seç…" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
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
              <div className="grid grid-cols-2 gap-1.5">
                {classrooms.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm transition-colors"
                    style={
                      classroomIds.includes(c.id)
                        ? { borderColor: 'var(--primary)', backgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)' }
                        : {}
                    }
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={classroomIds.includes(c.id)}
                      onChange={() => toggleClassroom(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
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
                    s.classroom_ids.map((id) => classroomMap[id] ?? id).join(', ')
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(s)}
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
    </div>
  )
}
