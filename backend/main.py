from fastapi import FastAPI, HTTPException, Depends, status, Body, Request, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator, Field, model_validator, ConfigDict
from typing import List, Optional, Union, Any
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload  # pyright: ignore[reportMissingImports]
import json
import uuid
from auth import (
    User as AuthUser, UserCreate, UserUpdate, UserResponse, Token,
    verify_password, get_password_hash, create_access_token,
    decode_token, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
)
from database import (
    Base, engine, SessionLocal, get_db,
    User, Task as TaskDB, SubTask as SubTaskDB
)
from db_helpers import task_db_to_pydantic, user_db_to_pydantic
from models import Task, SubTask

app = FastAPI(title="Gantt Chart API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация базы данных
Base.metadata.create_all(bind=engine)

# Инициализация супер-админа
def init_super_admin(db: Session):
    admin_email = "admin@admin.ru"
    admin_exists = db.query(User).filter(User.email == admin_email).first()
    if not admin_exists:
        admin_user = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            full_name="Супер Администратор",
            position="Супер Администратор",
            is_super_admin=True,
            password_hash=get_password_hash("admin123")
        )
        db.add(admin_user)
        db.commit()

# Инициализируем супер-админа при старте
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        init_super_admin(db)
    finally:
        db.close()

# Доступные месяцы в порядке отображения
AVAILABLE_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7]  # Декабрь, Январь, Февраль, Март, Апрель, Май, Июнь, Июль
MONTH_NAMES = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь"
}


# Функции для работы с пользователями
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_token(token)
    if token_data is None:
        raise credentials_exception
    user = get_user_by_email(db, token_data.email)
    if user is None:
        raise credentials_exception
    return user

def get_current_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

@app.get("/")
def read_root():
    return {"message": "Gantt Chart API"}

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    users_count = db.query(User).count()
    return {"status": "ok", "users_count": users_count}

# ========== АВТОРИЗАЦИЯ ==========

@app.post("/api/auth/login", response_model=Token, tags=["auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, form_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "is_super_admin": user.is_super_admin},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        position=current_user.position,
        is_super_admin=current_user.is_super_admin
    )

class CredentialsUpdate(BaseModel):
    new_email: Optional[str] = None
    new_password: Optional[str] = None

class PasswordReset(BaseModel):
    new_password: str

@app.put("/api/auth/update-credentials")
async def update_credentials(
    credentials: CredentialsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if credentials.new_email:
        # Проверяем, что email не занят другим пользователем
        existing_user = get_user_by_email(db, credentials.new_email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = credentials.new_email
    
    if credentials.new_password:
        user.password_hash = get_password_hash(credentials.new_password)
    
    db.commit()
    return {"message": "Credentials updated successfully"}

# ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только для супер-админа) ==========

@app.get("/api/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [user_db_to_pydantic(u) for u in users]

@app.post("/api/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    # Проверяем, что email не занят
    if get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email already in use")
    
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        full_name=user_data.full_name,
        position=user_data.position,
        is_super_admin=False,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return user_db_to_pydantic(new_user)

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_db_to_pydantic(user)

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Не позволяем изменять супер-админа (кроме текущего)
    if user.is_super_admin and user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify other super admin")
    
    if user_data.email:
        existing_user = get_user_by_email(db, user_data.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_data.email
    
    if user_data.full_name:
        user.full_name = user_data.full_name
    
    if user_data.position:
        user.position = user_data.position
    
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    return user_db_to_pydantic(user)

@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.post("/api/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: PasswordReset,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password reset successfully"}

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[GET TASKS] User: {current_user.email}, is_super_admin: {current_user.is_super_admin}, requested user_id: {user_id}")
    # Супер-админ может видеть все задачи или задачи конкретного пользователя
    query = db.query(TaskDB).options(joinedload(TaskDB.subtasks))
    
    if current_user.is_super_admin:
        if user_id:
            tasks = query.filter(TaskDB.user_id == user_id).all()
            print(f"[GET TASKS] Super admin filtering by user_id: {user_id}, found {len(tasks)} tasks")
        else:
            tasks = query.all()
            print(f"[GET TASKS] Super admin viewing all tasks, found {len(tasks)} tasks")
    else:
        # Обычный пользователь видит только свои задачи
        tasks = query.filter(TaskDB.user_id == current_user.id).all()
        print(f"[GET TASKS] Regular user viewing own tasks, found {len(tasks)} tasks")
    
    result = [task_db_to_pydantic(task) for task in tasks]
    print(f"[GET TASKS] Returning {len(result)} tasks: {[t.name for t in result]}")
    return result

@app.get("/api/tasks/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверяем права доступа
    if not current_user.is_super_admin and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return task_db_to_pydantic(task)

def validate_month(month):
    """Валидация месяца - должен быть в списке доступных"""
    return month in AVAILABLE_MONTHS if month else False

@app.post("/api/tasks")
async def create_task(
    request: FastAPIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Получаем сырое тело запроса и парсим JSON вручную
        body_bytes = await request.body()
        try:
            body = json.loads(body_bytes.decode('utf-8'))
            print(f"[CREATE TASK] User: {current_user.email}, Task data: {json.dumps(body, ensure_ascii=False)}")
        except json.JSONDecodeError as e:
            print(f"[CREATE TASK ERROR] JSON decode error: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Неверный формат JSON: {str(e)}"
            )
        
        # Обрабатываем отсутствующие поля для start_month и end_month
        # Если поля отсутствуют, добавляем их со значением None
        if 'start_month' not in body:
            body['start_month'] = None
        if 'end_month' not in body:
            body['end_month'] = None
        
        # Создаем объект Task из обработанных данных
        # model_validator(mode='before') также обработает отсутствующие поля
        task = Task.model_validate(body)
        
        # Устанавливаем duration_type по умолчанию если не указан
        if not task.duration_type:
            task.duration_type = "months"
        
        # Валидация в зависимости от типа периода
        if task.duration_type == "months":
            if not task.start_month or not validate_month(task.start_month):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Месяц начала должен быть одним из: {', '.join([MONTH_NAMES[m] for m in AVAILABLE_MONTHS])}"
                )
            if not task.end_month or not validate_month(task.end_month):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Месяц конца должен быть одним из: {', '.join([MONTH_NAMES[m] for m in AVAILABLE_MONTHS])}"
                )
        else:  # days
            if not task.start_date or not task.end_date:
                raise HTTPException(
                    status_code=400,
                    detail="Для режима дней необходимо указать дату начала и дату окончания"
                )
            try:
                start_dt = datetime.strptime(task.start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(task.end_date, "%Y-%m-%d")
                if start_dt > end_dt:
                    raise HTTPException(
                        status_code=400,
                        detail="Дата начала не может быть позже даты окончания"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Неверный формат даты. Используйте формат YYYY-MM-DD"
                )
        
        # Создаем задачу в БД
        task_id = str(uuid.uuid4())
        new_task = TaskDB(
            id=task_id,
            name=task.name,
            tag=task.tag,
            duration_type=task.duration_type,
            start_month=task.start_month,
            end_month=task.end_month,
            start_date=task.start_date,
            end_date=task.end_date,
            end_time=task.end_time,
            completed=task.completed if task.completed is not None else False,
            user_id=current_user.id
        )
        db.add(new_task)
        
        # Создаем подзадачи (только если они есть и не пустые)
        if task.subtasks:
            for subtask_data in task.subtasks:
                if subtask_data.name and subtask_data.name.strip():
                    subtask = SubTaskDB(
                        id=str(uuid.uuid4()),
                        name=subtask_data.name.strip(),
                        task_id=task_id,
                        start_month=task.start_month if task.duration_type == "months" else None,
                        end_month=task.end_month if task.duration_type == "months" else None,
                        start_date=task.start_date if task.duration_type == "days" else None,
                        end_date=task.end_date if task.duration_type == "days" else None
                    )
                    db.add(subtask)
        
        db.commit()
        db.refresh(new_task)
        result = task_db_to_pydantic(new_task)
        print(f"[CREATE TASK SUCCESS] Task created: id={result.id}, name={result.name}, duration_type={result.duration_type}, user_id={current_user.id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при создании задачи: {str(e)}"
        )

@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task: Task,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверяем права доступа
    if not current_user.is_super_admin and existing_task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Валидация в зависимости от типа периода
    if task.duration_type == "months":
        if not task.start_month or not validate_month(task.start_month):
            raise HTTPException(
                status_code=400, 
                detail=f"Месяц начала должен быть одним из: {', '.join([MONTH_NAMES[m] for m in AVAILABLE_MONTHS])}"
            )
        if not task.end_month or not validate_month(task.end_month):
            raise HTTPException(
                status_code=400, 
                detail=f"Месяц конца должен быть одним из: {', '.join([MONTH_NAMES[m] for m in AVAILABLE_MONTHS])}"
            )
    else:  # days
        if not task.start_date or not task.end_date:
            raise HTTPException(
                status_code=400,
                detail="Для режима дней необходимо указать дату начала и дату окончания"
            )
        try:
            start_dt = datetime.strptime(task.start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(task.end_date, "%Y-%m-%d")
            if start_dt > end_dt:
                raise HTTPException(
                    status_code=400,
                    detail="Дата начала не может быть позже даты окончания"
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    # Обновляем задачу
    existing_task.name = task.name
    existing_task.tag = task.tag
    existing_task.duration_type = task.duration_type
    existing_task.start_month = task.start_month
    existing_task.end_month = task.end_month
    existing_task.start_date = task.start_date
    existing_task.end_date = task.end_date
    existing_task.end_time = task.end_time
    existing_task.completed = task.completed
    
    # Удаляем старые подзадачи
    db.query(SubTaskDB).filter(SubTaskDB.task_id == task_id).delete()
    
    # Создаем новые подзадачи
    for subtask_data in task.subtasks:
        subtask = SubTaskDB(
            id=subtask_data.id if subtask_data.id else str(uuid.uuid4()),
            name=subtask_data.name,
            task_id=task_id,
            start_month=task.start_month if task.duration_type == "months" else None,
            end_month=task.end_month if task.duration_type == "months" else None,
            start_date=task.start_date if task.duration_type == "days" else None,
            end_date=task.end_date if task.duration_type == "days" else None
        )
        db.add(subtask)
    
    db.commit()
    db.refresh(existing_task)
    return task_db_to_pydantic(existing_task)

@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверяем права доступа
    if not current_user.is_super_admin and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

@app.patch("/api/tasks/{task_id}/complete")
async def toggle_task_complete(
    task_id: str,
    completed: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверяем права доступа
    if not current_user.is_super_admin and task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    task.completed = completed
    if completed:
        # Сохраняем дату и время завершения
        task.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    else:
        # Сбрасываем дату завершения при отмене
        task.completed_at = None
    
    db.commit()
    db.refresh(task)
    return task_db_to_pydantic(task)

def is_month_in_range(check_month, start_month, end_month):
    """Проверяет, находится ли месяц в диапазоне (с учетом циклического порядка)"""
    start_idx = AVAILABLE_MONTHS.index(start_month) if start_month in AVAILABLE_MONTHS else -1
    end_idx = AVAILABLE_MONTHS.index(end_month) if end_month in AVAILABLE_MONTHS else -1
    check_idx = AVAILABLE_MONTHS.index(check_month) if check_month in AVAILABLE_MONTHS else -1
    
    if start_idx == -1 or end_idx == -1 or check_idx == -1:
        return False
    
    # Если диапазон не переходит через конец списка
    if start_idx <= end_idx:
        return start_idx <= check_idx <= end_idx
    # Если диапазон переходит через конец списка (например, декабрь -> январь)
    else:
        return check_idx >= start_idx or check_idx <= end_idx

@app.get("/api/tasks/export/csv")
async def export_tasks_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import html
    
    # Создаем HTML таблицу, которую Excel может открыть с форматированием
    html_content = []
    html_content.append('<table border="1" cellpadding="5" cellspacing="0">')
    
    # Заголовки - такие же как в Gantt таблице
    html_content.append('<tr>')
    html_content.append('<th><b>Задача</b></th>')
    html_content.append('<th><b>Проект</b></th>')
    for month in AVAILABLE_MONTHS:
        html_content.append(f'<th><b>{MONTH_NAMES[month]}</b></th>')
    html_content.append('<th><b>Выполнено</b></th>')
    html_content.append('</tr>')
    
    # Фильтруем задачи в зависимости от пользователя
    if current_user.is_super_admin:
        tasks = db.query(TaskDB).all()
    else:
        tasks = db.query(TaskDB).filter(TaskDB.user_id == current_user.id).all()
    
    filtered_tasks = [task_db_to_pydantic(task) for task in tasks]
    
    # Данные
    for idx, task in enumerate(filtered_tasks):
        start_month = task.start_month or AVAILABLE_MONTHS[0]
        end_month = task.end_month or AVAILABLE_MONTHS[0]
        completed = task.completed or False
        
        # Основная задача - жирным текстом
        html_content.append('<tr>')
        task_name = html.escape(task.name)
        project_name = html.escape(task.tag)
        completed_text = 'Да' if completed else 'Нет'
        
        html_content.append(f'<td><b>{task_name}</b></td>')
        html_content.append(f'<td><b>{project_name}</b></td>')
        
        for month in AVAILABLE_MONTHS:
            if is_month_in_range(month, start_month, end_month):
                html_content.append('<td>X</td>')
            else:
                html_content.append('<td></td>')
        
        html_content.append(f'<td>{completed_text}</td>')
        html_content.append('</tr>')
        
        # Подзадачи - тонким шрифтом
        for subtask in task.subtasks:
            st_start_month = subtask.start_month or start_month
            st_end_month = subtask.end_month or end_month
            
            html_content.append('<tr>')
            subtask_name = html.escape(subtask.name)
            html_content.append(f'<td class="subtask" style="font-weight: 300; font-style: normal;">  └─ {subtask_name}</td>')
            html_content.append('<td></td>')  # Пустая колонка для проекта
            
            for month in AVAILABLE_MONTHS:
                if is_month_in_range(month, st_start_month, st_end_month):
                    html_content.append('<td>X</td>')
                else:
                    html_content.append('<td></td>')
            
            html_content.append('<td></td>')  # Пустая колонка для "Выполнено"
            html_content.append('</tr>')
        
        # Добавляем пустую строку между основными задачами (кроме последней)
        if idx < len(filtered_tasks) - 1:
            html_content.append('<tr>')
            for _ in range(len(AVAILABLE_MONTHS) + 3):  # Задача, Проект, месяцы, Выполнено
                html_content.append('<td></td>')
            html_content.append('</tr>')
    
    html_content.append('</table>')
    
    # Возвращаем HTML контент (Excel может открыть HTML как таблицу)
    return {"csv": ''.join(html_content), "format": "html"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

