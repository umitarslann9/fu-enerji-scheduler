from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Uygulama başlarken DB tablolarını oluştur
    init_db()
    yield
    # Kapanırken bir şey yapmıyoruz


app = FastAPI(
    title="Fu Enerji Scheduler API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}