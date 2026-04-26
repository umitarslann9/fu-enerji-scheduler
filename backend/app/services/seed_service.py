from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.models.schemas import (
    Classroom,
    ClassroomSubjectLink,
    ScheduleResult,
    Subject,
    Teacher,
    default_availability,
)

_GRADES = [9, 10, 11, 12]
_SECTIONS = ["A", "B", "C", "D"]  # 4 şube → 16 sınıf


def seed(session: Session) -> dict:
    """Tüm veriyi temizle ve demo lise kurulumunu ekle."""

    session.execute(sql_delete(ScheduleResult))
    session.execute(sql_delete(ClassroomSubjectLink))
    session.execute(sql_delete(Subject))
    session.execute(sql_delete(Classroom))
    session.execute(sql_delete(Teacher))

    # --- 16 sınıf: 9-12, A-D ---
    for grade in _GRADES:
        for section in _SECTIONS:
            session.add(Classroom(
                grade=grade,
                section=section,
                student_count=30,
                name=f"{grade}-{section}",
            ))
    session.flush()

    cls_map = {
        (c.grade, c.section): c.id
        for c in session.exec(select(Classroom)).all()
    }

    def grade_ids(grade: int) -> list[int]:
        return [cls_map[(grade, sec)] for sec in _SECTIONS]

    def multi_ids(*grades: int) -> list[int]:
        return [cid for g in grades for cid in grade_ids(g)]

    # (öğretmen_adı, branş, haftalık_saat, sınıf_id_listesi)
    # Toplam: 33 saat/hafta/sınıf → ~%82 doluluk
    entries: list[tuple[str, str, int, list[int]]] = [

        # --- Matematik 6h — her sınıf seviyesi için ayrı öğretmen ---
        ("Ahmet Yılmaz",  "Matematik", 6, grade_ids(9)),
        ("Mehmet Demir",  "Matematik", 6, grade_ids(10)),
        ("Ali Çelik",     "Matematik", 6, grade_ids(11)),
        ("Ayşe Kaya",     "Matematik", 6, grade_ids(12)),

        # --- Türk Dili ve Edebiyatı 5h — her sınıf seviyesi için ayrı öğretmen ---
        ("Fatma Şahin",   "Türk Dili ve Edebiyatı", 5, grade_ids(9)),
        ("Zeynep Arslan", "Türk Dili ve Edebiyatı", 5, grade_ids(10)),
        ("Hüseyin Doğan", "Türk Dili ve Edebiyatı", 5, grade_ids(11)),
        ("Meryem Öztürk", "Türk Dili ve Edebiyatı", 5, grade_ids(12)),

        # --- İngilizce 4h — her sınıf seviyesi için ayrı öğretmen ---
        ("David Miller",  "İngilizce", 4, grade_ids(9)),
        ("Sarah Johnson", "İngilizce", 4, grade_ids(10)),
        ("Emily Brown",   "İngilizce", 4, grade_ids(11)),
        ("James Wilson",  "İngilizce", 4, grade_ids(12)),

        # --- Fizik 3h — 2 öğretmen (9-10 / 11-12) ---
        ("Kadir Aydın",   "Fizik", 3, multi_ids(9, 10)),
        ("Selin Yıldız",  "Fizik", 3, multi_ids(11, 12)),

        # --- Kimya 3h — 2 öğretmen ---
        ("Burak Karahan", "Kimya", 3, multi_ids(9, 10)),
        ("Deniz Çakır",   "Kimya", 3, multi_ids(11, 12)),

        # --- Biyoloji 3h — 2 öğretmen ---
        ("Merve Güneş",   "Biyoloji", 3, multi_ids(9, 10)),
        ("Tarık Koç",     "Biyoloji", 3, multi_ids(11, 12)),

        # --- Tarih 3h — 2 öğretmen ---
        ("Nilüfer Aktaş", "Tarih", 3, multi_ids(9, 10)),
        ("Serdar Yılmaz", "Tarih", 3, multi_ids(11, 12)),

        # --- Coğrafya 2h — 2 öğretmen ---
        ("Pınar Kaya",    "Coğrafya", 2, multi_ids(9, 10)),
        ("Okan Demir",    "Coğrafya", 2, multi_ids(11, 12)),

        # --- Beden Eğitimi 2h — 2 öğretmen ---
        ("Mustafa Çetin", "Beden Eğitimi", 2, multi_ids(9, 10)),
        ("Gözde Arslan",  "Beden Eğitimi", 2, multi_ids(11, 12)),

        # --- Müzik 1h — 1 öğretmen, tüm sınıflar ---
        ("Cem Özkan",     "Müzik", 1, multi_ids(9, 10, 11, 12)),

        # --- Görsel Sanatlar 1h — 1 öğretmen, tüm sınıflar ---
        ("Aslı Yıldırım", "Görsel Sanatlar", 1, multi_ids(9, 10, 11, 12)),
    ]

    # Öğretmenler
    teacher_objs: list[Teacher] = []
    for name, branch, _, _ in entries:
        t = Teacher(name=name, branch=branch, availability=default_availability())
        session.add(t)
        teacher_objs.append(t)
    session.flush()

    # Dersler
    subject_objs: list[tuple[Subject, list[int]]] = []
    for (_, branch, hours, cls_ids), teacher in zip(entries, teacher_objs):
        s = Subject(name=branch, weekly_hours=hours, teacher_id=teacher.id)
        session.add(s)
        subject_objs.append((s, cls_ids))
    session.flush()

    # Sınıf-ders bağlantıları
    for subject, cls_ids in subject_objs:
        for cid in cls_ids:
            session.add(ClassroomSubjectLink(classroom_id=cid, subject_id=subject.id))

    session.commit()

    return {
        "classrooms": len(_GRADES) * len(_SECTIONS),
        "teachers": len(entries),
        "subjects": len(entries),
    }
