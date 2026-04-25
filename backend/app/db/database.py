from pathlib import Path
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session

# SQLite dosyası backend/ klasöründe oluşacak
DB_PATH = Path(__file__).parent.parent.parent / "scheduler.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False: FastAPI multi-thread için
engine = create_engine(
    DATABASE_URL,
    echo=False,  # True yaparsan tüm SQL sorgularını loglar (debug için)
    connect_args={"check_same_thread": False},
)


def init_db():
    """Tabloları oluştur (uygulama başlarken çağrılır)."""
    SQLModel.metadata.create_all(engine)
    with engine.connect() as conn:
        # --- teacher: branch kolonu ---
        teacher_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(teacher)"))]
        if "branch" not in teacher_cols:
            conn.execute(text("ALTER TABLE teacher ADD COLUMN branch VARCHAR NOT NULL DEFAULT ''"))
            conn.commit()

        # --- classroom: section + student_count kolonları ---
        classroom_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(classroom)"))]
        if "section" not in classroom_cols:
            conn.execute(text("ALTER TABLE classroom ADD COLUMN section VARCHAR NOT NULL DEFAULT 'A'"))
            # Mevcut name'den şubeyi çıkar: "9-A" → "A"
            conn.execute(text("""
                UPDATE classroom
                SET section = CASE
                    WHEN INSTR(name, '-') > 0
                    THEN TRIM(SUBSTR(name, INSTR(name, '-') + 1))
                    ELSE 'A'
                END
            """))
            conn.commit()
        if "student_count" not in classroom_cols:
            conn.execute(text("ALTER TABLE classroom ADD COLUMN student_count INTEGER NOT NULL DEFAULT 0"))
            conn.commit()


def get_session():
    """FastAPI dependency: her request için bir session."""
    with Session(engine) as session:
        yield session