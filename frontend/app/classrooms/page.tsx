'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import type { Classroom } from '@/lib/types'
import { Loader2, Trash2 } from 'lucide-react'

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [adding, setAdding] = useState(false)

  function load() {
    api.classrooms
      .list()
      .then(setClassrooms)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const g = parseInt(grade)
    if (!name.trim() || isNaN(g) || g < 1 || g > 12) return
    setAdding(true)
    try {
      await api.classrooms.create(name.trim(), g)
      toast.success(`${name.trim()} eklendi.`)
      setName('')
      setGrade('')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(c: Classroom) {
    try {
      await api.classrooms.delete(c.id)
      toast.success(`${c.name} silindi.`)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sınıflar</h1>

      <form onSubmit={handleAdd} className="flex max-w-md gap-2">
        <Input
          placeholder="Sınıf adı (örn. 9-A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={adding}
          className="flex-1"
        />
        <Input
          placeholder="Seviye"
          type="number"
          min={1}
          max={12}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          disabled={adding}
          className="w-24"
        />
        <Button type="submit" disabled={adding || !name.trim() || !grade}>
          {adding && <Loader2 className="mr-1 size-3 animate-spin" />}
          Ekle
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Yükleniyor…
        </div>
      ) : classrooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz sınıf eklenmedi.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sınıf</TableHead>
              <TableHead>Seviye</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {classrooms.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.grade}. sınıf</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(c)}
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
