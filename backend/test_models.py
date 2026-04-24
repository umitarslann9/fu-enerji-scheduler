"""
Veri modellerini hızlıca test eden script.
Gerçek CRUD endpoint'lerini yazmadan önce modellerin
doğru kurgulandığından emin olmak için.
"""
from sqlmodel import Session, select
from app.db.database import engine, init_db
from app.models.schemas import (
    Teacher, Classroom, Subject, ClassroomSubjectLink,
    default_availability, parse_availability,
)


def test_models():
    # Tabloları garantiye al
    init_db()

    with Session(engine) as session:
        # --- 1. Öğretmen oluştur ---
        teacher = Teacher(name="Ahmet Hoca")
        session.add(teacher)
        session.commit()
        session.refresh(teacher)
        print(f"✅ Teacher oluşturuldu: id={teacher.id}, name={teacher.name}")

        # Müsaitlik matrix'ini parse edebiliyor muyuz?
        matrix = parse_availability(teacher.availability)
        assert len(matrix) == 5, "Gün sayısı 5 olmalı"
        assert len(matrix[0]) == 8, "Period sayısı 8 olmalı"
        assert all(all(slot for slot in day) for day in matrix), "Varsayılan: hepsi True"
        print(f"✅ Availability matrix: {len(matrix)} gün × {len(matrix[0])} period, hepsi müsait")

        # --- 2. Sınıflar oluştur ---
        class_9a = Classroom(name="9-A", grade=9)
        class_9b = Classroom(name="9-B", grade=9)
        session.add(class_9a)
        session.add(class_9b)
        session.commit()
        session.refresh(class_9a)
        session.refresh(class_9b)
        print(f"✅ Classrooms: {class_9a.name} (id={class_9a.id}), {class_9b.name} (id={class_9b.id})")

        # --- 3. Ders oluştur ve iki sınıfa birden bağla (many-to-many test!) ---
        math = Subject(name="Matematik", weekly_hours=5, teacher_id=teacher.id)
        math.classrooms = [class_9a, class_9b]  # many-to-many ilişki
        session.add(math)
        session.commit()
        session.refresh(math)
        print(f"✅ Subject oluşturuldu: {math.name}, hafta saati={math.weekly_hours}")
        print(f"   Bu ders şu sınıflara atandı: {[c.name for c in math.classrooms]}")
        print(f"   Bu dersin öğretmeni: {math.teacher.name}")

        # --- 4. Ters yönden ilişki çalışıyor mu? ---
        # 9-A'nın hangi dersleri var?
        fresh_9a = session.get(Classroom, class_9a.id)
        print(f"✅ {fresh_9a.name} şu dersleri alıyor: {[s.name for s in fresh_9a.subjects]}")

        # --- 5. Teacher'ın dersleri ---
        fresh_teacher = session.get(Teacher, teacher.id)
        print(f"✅ {fresh_teacher.name} şu dersleri veriyor: {[s.name for s in fresh_teacher.subjects]}")

        # --- 6. Temizlik (DB'yi kirli bırakmayalım) ---
        session.delete(math)
        session.delete(class_9a)
        session.delete(class_9b)
        session.delete(teacher)
        session.commit()
        print("✅ Test verileri temizlendi.")

    print("\n🎉 Tüm testler geçti — modeller doğru kurgulanmış.")


if __name__ == "__main__":
    test_models()