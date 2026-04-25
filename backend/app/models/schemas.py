"""
Veri modelleri — SQLModel hem Pydantic validation hem SQLAlchemy ORM sağlar.

Tasarım kararları:
- Teacher-Subject: 1-to-many (her ders tek öğretmen)
- Subject-Classroom: many-to-many (ClassroomSubject association table ile)
- Availability: 5x8 boolean matrix → JSON string olarak saklanır
  (SQLite'ta native array yok, serialize etmek en temiz çözüm)
"""

from typing import Optional, List
from pydantic import field_validator
from sqlmodel import SQLModel, Field, Relationship
import json


# ============================================================
# AVAILABILITY HELPER
# ============================================================

DAYS = 5   # Pazartesi-Cuma
PERIODS = 8  # Günde 8 ders saati


def default_availability() -> str:
    """Varsayılan: tüm slotlar müsait (5x8 matrix, hepsi True)."""
    matrix = [[True for _ in range(PERIODS)] for _ in range(DAYS)]
    return json.dumps(matrix)


def parse_availability(s: str) -> List[List[bool]]:
    """JSON string → 5x8 matrix. Bozuk veri varsa tüm slotları müsait döndür."""
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return [[True] * PERIODS for _ in range(DAYS)]


# ============================================================
# ASSOCIATION TABLE (many-to-many: Classroom <-> Subject)
# ============================================================

class ClassroomSubjectLink(SQLModel, table=True):
    """
    Bir sınıfın hangi dersleri alacağını tutar.
    Bu, case'deki 'esnek ilişki' kararımızın teknik karşılığı.
    """
    classroom_id: Optional[int] = Field(
        default=None, foreign_key="classroom.id", primary_key=True
    )
    subject_id: Optional[int] = Field(
        default=None, foreign_key="subject.id", primary_key=True
    )


# ============================================================
# TEACHER
# ============================================================

class TeacherBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    # default='' → mevcut DB kayıtlarında boş olabilir, min_length response'u kırmaz
    branch: str = Field(default='', max_length=100)
    # JSON-encoded 5x8 matrix — SQLite için en pratik yol
    availability: str = Field(default_factory=default_availability)


class Teacher(TeacherBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subjects: List["Subject"] = Relationship(back_populates="teacher")


class TeacherCreate(TeacherBase):
    @field_validator('branch')
    @classmethod
    def branch_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Branş zorunludur')
        return v.strip()


class TeacherRead(TeacherBase):
    id: int


class TeacherUpdate(SQLModel):
    name: Optional[str] = None
    branch: Optional[str] = Field(default=None, max_length=100)
    availability: Optional[str] = None

    @field_validator('branch')
    @classmethod
    def branch_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError('Branş boş olamaz')
        return v


# ============================================================
# CLASSROOM
# ============================================================

class ClassroomBase(SQLModel):
    grade: int = Field(ge=1, le=12)
    section: str = Field(min_length=1, max_length=10)   # örn "A", "B"
    student_count: int = Field(ge=0, default=0)


class Classroom(ClassroomBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default='')   # "{grade}-{section}", servis tarafından güncellenir
    subjects: List["Subject"] = Relationship(
        back_populates="classrooms",
        link_model=ClassroomSubjectLink,
    )


class ClassroomCreate(ClassroomBase):
    pass


class ClassroomRead(ClassroomBase):
    id: int
    name: str   # türetilmiş görüntü adı


class ClassroomUpdate(SQLModel):
    grade: Optional[int] = Field(default=None, ge=1, le=12)
    section: Optional[str] = Field(default=None, max_length=10)
    student_count: Optional[int] = Field(default=None, ge=0)

    @field_validator('section')
    @classmethod
    def section_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError('Şube boş olamaz')
        return v.strip() if v else v


# ============================================================
# SUBJECT
# ============================================================

class SubjectBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    weekly_hours: int = Field(ge=1, le=6)   # haftada 1-6 saat
    teacher_id: int = Field(foreign_key="teacher.id")


class Subject(SubjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher: Optional[Teacher] = Relationship(back_populates="subjects")
    classrooms: List[Classroom] = Relationship(
        back_populates="subjects",
        link_model=ClassroomSubjectLink,
    )


class SubjectCreate(SubjectBase):
    classroom_ids: List[int] = Field(default_factory=list)  # hangi sınıflar alıyor


class SubjectRead(SubjectBase):
    id: int
    classroom_ids: List[int] = Field(default_factory=list)


# ============================================================
# LESSON (atanmış, scheduler çıktısı — DB'de tutulmuyor şimdilik)
# ============================================================

class Lesson(SQLModel):
    """Bir programda tek bir hücre. Scheduler tarafından üretilir."""
    subject_id: int
    subject_name: str      # UI için, tekrar tekrar join atmamak adına
    teacher_id: int
    teacher_name: str
    classroom_id: int
    classroom_name: str
    day: int = Field(ge=0, le=4)     # 0=Pzt, 4=Cum
    period: int = Field(ge=0, le=7)  # 0-7 arası 8 ders


class Schedule(SQLModel):
    """Scheduler çıktısı: bir haftalık program."""
    lessons: List[Lesson]
    generated_at: str  # ISO format timestamp
    is_feasible: bool
    message: Optional[str] = None  # "başarılı" veya infeasible nedeni


# ============================================================
# SCHEDULE RESULT (DB'de saklanan program kaydı)
# ============================================================

class ScheduleResult(SQLModel, table=True):
    """
    Üretilen programın DB kaydı.
    Lesson listesini JSON string olarak saklar — SQLite'ta nested
    array yoktur, serialize en temiz çözümdür.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    lessons_json: str           # JSON-encoded list[Lesson]
    generated_at: str
    is_feasible: bool
    message: Optional[str] = None