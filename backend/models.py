"""Pydantic модели для API"""
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import List, Optional, Any

class SubTask(BaseModel):
    id: Optional[str] = Field(default=None)
    name: str
    start_month: Optional[int] = Field(default=None)  # Месяц из AVAILABLE_MONTHS (для режима месяцев)
    end_month: Optional[int] = Field(default=None)    # Месяц из AVAILABLE_MONTHS (для режима месяцев)
    start_date: Optional[str] = Field(default=None)   # Дата начала в формате YYYY-MM-DD (для режима дней)
    end_date: Optional[str] = Field(default=None)     # Дата окончания в формате YYYY-MM-DD (для режима дней)
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        extra='allow'
    )
    
    @field_validator('start_month', 'end_month', mode='before')
    @classmethod
    def validate_month_null(cls, v):
        # Принимаем None и null как None
        if v is None:
            return None
        return v

class Task(BaseModel):
    id: Optional[str] = None
    name: str
    tag: str
    duration_type: Optional[str] = "months"  # "months" или "days"
    start_month: Optional[int] = Field(default=None)  # Месяц из AVAILABLE_MONTHS (для режима месяцев)
    end_month: Optional[int] = Field(default=None)    # Месяц из AVAILABLE_MONTHS (для режима месяцев)
    start_date: Optional[str] = Field(default=None)   # Дата начала в формате YYYY-MM-DD (для режима дней)
    end_date: Optional[str] = Field(default=None)     # Дата окончания в формате YYYY-MM-DD (для режима дней)
    end_time: Optional[str] = Field(default="18:00")  # Время окончания по умолчанию 18:00
    completed: Optional[bool] = Field(default=False)  # Отметка о выполнении
    completed_at: Optional[str] = Field(default=None)  # Дата и время завершения задачи в формате YYYY-MM-DD HH:MM
    user_id: Optional[str] = Field(default=None)  # ID пользователя, которому принадлежит задача
    subtasks: List[SubTask] = Field(default_factory=list)
    
    @model_validator(mode='before')
    @classmethod
    def validate_month_fields(cls, data: Any):
        if isinstance(data, dict):
            # Если поля отсутствуют, добавляем их со значением None
            if 'start_month' not in data:
                data['start_month'] = None
            if 'end_month' not in data:
                data['end_month'] = None
            # Преобразуем null, None и строку "null" в None для start_month и end_month
            for field in ['start_month', 'end_month']:
                if field in data:
                    val = data[field]
                    if val is None or val == "null" or val == "":
                        data[field] = None
                    elif isinstance(val, str) and val.isdigit():
                        # Если это строка с цифрой, преобразуем в int
                        data[field] = int(val)
                    elif not isinstance(val, int):
                        # Если это не int и не None, устанавливаем None
                        data[field] = None
        return data
    
    @model_validator(mode='after')
    @classmethod
    def normalize_month_fields(cls, model):
        # Преобразуем значения, которые не являются int, в None
        if model.start_month is not None and not isinstance(model.start_month, int):
            model.start_month = None
        if model.end_month is not None and not isinstance(model.end_month, int):
            model.end_month = None
        return model
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        extra='allow'  # Разрешаем дополнительные поля
    )

