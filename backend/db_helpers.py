"""Вспомогательные функции для работы с базой данных"""
from database import Task as TaskDB, SubTask as SubTaskDB, User as UserDB
from models import Task, SubTask
from auth import UserResponse
from typing import List


def task_db_to_pydantic(task_db: TaskDB) -> Task:
    """Конвертирует модель БД Task в Pydantic модель"""
    subtasks = [
        SubTask(
            id=st.id,
            name=st.name,
            start_month=st.start_month,
            end_month=st.end_month,
            start_date=st.start_date,
            end_date=st.end_date
        )
        for st in task_db.subtasks
    ]
    
    return Task(
        id=task_db.id,
        name=task_db.name,
        tag=task_db.tag,
        duration_type=task_db.duration_type,
        start_month=task_db.start_month,
        end_month=task_db.end_month,
        start_date=task_db.start_date,
        end_date=task_db.end_date,
        end_time=task_db.end_time,
        completed=task_db.completed,
        completed_at=task_db.completed_at,
        user_id=task_db.user_id,
        subtasks=subtasks
    )


def user_db_to_pydantic(user_db: UserDB) -> UserResponse:
    """Конвертирует модель БД User в Pydantic модель"""
    return UserResponse(
        id=user_db.id,
        email=user_db.email,
        full_name=user_db.full_name,
        position=user_db.position,
        is_super_admin=user_db.is_super_admin
    )

