from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

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


def get_session():
    """FastAPI dependency: her request için bir session."""
    with Session(engine) as session:
        yield session