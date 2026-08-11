from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.api import auth
from app.models import user, property

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rent Safe AI")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite default port
    "http://localhost:5174", # Vite alternative port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Rent Safe AI API"}
