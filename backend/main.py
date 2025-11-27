from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

from .routers import translate

# Load .env from parent directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("MDTranslator Backend starting...")
    print(f"QWEN_API_KEY configured: {'Yes' if os.getenv('QWEN_API_KEY') else 'No'}")
    print(f"QWEN_API_URL: {os.getenv('QWEN_API_URL', 'default')}")
    print(f"QWEN_MODEL_NAME: {os.getenv('QWEN_MODEL_NAME', 'qwen-flash')}")
    yield
    # Shutdown
    print("MDTranslator Backend shutting down...")

app = FastAPI(title="MDTranslator Backend", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translate.router)

@app.get("/")
async def root():
    return {"message": "MDTranslator Backend Running"}

