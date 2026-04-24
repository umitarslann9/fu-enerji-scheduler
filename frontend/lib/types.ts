export interface Teacher {
  id: number
  name: string
  availability: string // JSON 5×8 boolean matrix
}

export interface Classroom {
  id: number
  name: string
  grade: number
}

export interface Subject {
  id: number
  name: string
  weekly_hours: number
  teacher_id: number
  classroom_ids: number[]
}

export interface Lesson {
  subject_id: number
  subject_name: string
  teacher_id: number
  teacher_name: string
  classroom_id: number
  classroom_name: string
  day: number    // 0=Pzt … 4=Cum
  period: number // 0-7
}

export interface Schedule {
  lessons: Lesson[]
  generated_at: string
  is_feasible: boolean
  message: string | null
}
