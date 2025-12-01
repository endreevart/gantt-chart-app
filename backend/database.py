from sqlalchemy import create_engine, Column, String, Boolean, Integer, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Получаем URL базы данных из переменных окружения или используем значение по умолчанию
# Для разработки можно использовать SQLite, для продакшена - PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./gantt.db"  # SQLite для разработки (если PostgreSQL не настроен)
    # "postgresql://postgres:postgres@localhost:5432/gantt_db"  # PostgreSQL для продакшена
)

# Для SQLite нужно добавить connect_args
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
else:
    engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    is_super_admin = Column(Boolean, default=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tag = Column(String, nullable=False)
    duration_type = Column(String, default="months")  # "months" или "days"
    
    # Для режима месяцев
    start_month = Column(Integer, nullable=True)
    end_month = Column(Integer, nullable=True)
    
    # Для режима дней
    start_date = Column(String, nullable=True)  # YYYY-MM-DD
    end_date = Column(String, nullable=True)    # YYYY-MM-DD
    end_time = Column(String, default="18:00")  # HH:MM
    
    completed = Column(Boolean, default=False)
    completed_at = Column(String, nullable=True)  # YYYY-MM-DD HH:MM
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связь с подзадачами
    subtasks = relationship("SubTask", back_populates="task", cascade="all, delete-orphan")


class SubTask(Base):
    __tablename__ = "subtasks"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    
    # Для режима месяцев
    start_month = Column(Integer, nullable=True)
    end_month = Column(Integer, nullable=True)
    
    # Для режима дней
    start_date = Column(String, nullable=True)  # YYYY-MM-DD
    end_date = Column(String, nullable=True)    # YYYY-MM-DD

    task = relationship("Task", back_populates="subtasks")


def init_db():
    """Создает все таблицы в базе данных"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency для получения сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

