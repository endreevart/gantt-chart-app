import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Switch,
  FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateIcon from '@mui/icons-material/Create';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api';

// Доступные месяцы в порядке отображения
const AVAILABLE_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7]; // Декабрь, Январь, Февраль, Март, Апрель, Май, Июнь, Июль

const monthNames = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
};

function TaskForm({ onTaskCreated, editingTask, onCancelEdit, allTasks = [] }) {
  const isEditing = !!editingTask;
  
  // Получаем список проектов из существующих задач и localStorage
  const getAvailableProjects = () => {
    const fromTasks = [...new Set(allTasks.map(task => task.tag).filter(Boolean))];
    const fromStorage = JSON.parse(localStorage.getItem('projects') || '[]');
    const combined = [...new Set([...fromTasks, ...fromStorage])];
    return combined.sort();
  };
  
  const [name, setName] = useState(editingTask?.name || '');
  const [tag, setTag] = useState(editingTask?.tag || '');
  const [availableProjects, setAvailableProjects] = useState(() => getAvailableProjects());
  const [durationType, setDurationType] = useState(editingTask?.duration_type || 'months'); // 'months' или 'days'
  const [startMonth, setStartMonth] = useState(editingTask?.start_month || AVAILABLE_MONTHS[0]);
  const [endMonth, setEndMonth] = useState(editingTask?.end_month || AVAILABLE_MONTHS[0]);
  const [startDate, setStartDate] = useState(editingTask?.start_date || '');
  const [endDate, setEndDate] = useState(editingTask?.end_date || '');
  const [endTime, setEndTime] = useState(editingTask?.end_time || '18:00');
  const [subtasks, setSubtasks] = useState(
    editingTask?.subtasks && editingTask.subtasks.length > 0
      ? editingTask.subtasks.map(st => ({ name: st.name, id: st.id }))
      : [{ name: '' }]
  );
  
  // Обновляем состояние при изменении editingTask
  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name || '');
      setTag(editingTask.tag || '');
      setDurationType(editingTask.duration_type || 'months');
      setStartMonth(editingTask.start_month || AVAILABLE_MONTHS[0]);
      setEndMonth(editingTask.end_month || AVAILABLE_MONTHS[0]);
      setStartDate(editingTask.start_date || '');
      setEndDate(editingTask.end_date || '');
      setEndTime(editingTask.end_time || '18:00');
      setSubtasks(
        editingTask.subtasks && editingTask.subtasks.length > 0
          ? editingTask.subtasks.map(st => ({ name: st.name, id: st.id }))
          : [{ name: '' }]
      );
    } else {
      // Сброс формы при создании новой задачи
      setName('');
      setTag('');
      setDurationType('months');
      setStartMonth(AVAILABLE_MONTHS[0]);
      setEndMonth(AVAILABLE_MONTHS[0]);
      setStartDate('');
      setEndDate('');
      setEndTime('18:00');
      setSubtasks([{ name: '' }]);
    }
  }, [editingTask]);

  // Обновляем список проектов при изменении задач
  useEffect(() => {
    setAvailableProjects(getAvailableProjects());
  }, [allTasks]);

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { name: '' }]);
  };

  const handleRemoveSubtask = (index) => {
    if (subtasks.length > 1) {
      const newSubtasks = subtasks.filter((_, i) => i !== index);
      setSubtasks(newSubtasks);
    }
  };

  const handleSubtaskChange = (index, value) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index].name = value;
    setSubtasks(newSubtasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !tag.trim()) {
      alert('Пожалуйста, заполните название задачи и проект');
      return;
    }

    // Валидация в зависимости от типа периода
    if (durationType === 'months') {
      if (!AVAILABLE_MONTHS.includes(startMonth)) {
        alert(`Месяц начала должен быть одним из: ${AVAILABLE_MONTHS.map(m => monthNames[m]).join(', ')}`);
        return;
      }
      if (!AVAILABLE_MONTHS.includes(endMonth)) {
        alert(`Месяц конца должен быть одним из: ${AVAILABLE_MONTHS.map(m => monthNames[m]).join(', ')}`);
        return;
      }
    } else {
      if (!startDate) {
        alert('Пожалуйста, укажите дату начала');
        return;
      }
      if (!endDate) {
        alert('Пожалуйста, укажите дату окончания');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        alert('Дата начала не может быть позже даты окончания');
        return;
      }
    }

    const validSubtasks = subtasks.filter(st => st.name.trim());

    try {
      // Создаем объект задачи - не включаем поля, которые равны null
      const taskData = {
        name: name.trim(),
        tag: tag.trim(),
        duration_type: durationType
      };
      
      if (durationType === 'months') {
        taskData.start_month = startMonth;
        taskData.end_month = endMonth;
      } else {
        taskData.start_date = startDate;
        taskData.end_date = endDate;
        taskData.end_time = endTime;
        // Не включаем start_month и end_month для режима дней
      }
      
      taskData.subtasks = validSubtasks.map(st => {
        const subtask = {
          ...(st.id && { id: st.id }),
          name: st.name.trim()
        };
        
        if (durationType === 'months') {
          subtask.start_month = startMonth;
          subtask.end_month = endMonth;
        } else {
          subtask.start_date = startDate;
          subtask.end_date = endDate;
          // Не включаем start_month и end_month для режима дней
        }
        
        return subtask;
      });

      // Сохраняем проект в localStorage
      if (tag.trim()) {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        if (!savedProjects.includes(tag.trim())) {
          savedProjects.push(tag.trim());
          localStorage.setItem('projects', JSON.stringify(savedProjects));
          setAvailableProjects(getAvailableProjects());
        }
      }

      if (isEditing) {
        // Редактирование существующей задачи
        await axios.put(`${API_URL}/tasks/${editingTask.id}`, taskData);
        alert('Задача успешно обновлена!');
        if (onCancelEdit) onCancelEdit();
      } else {
        // Создание новой задачи
        try {
          await axios.post(`${API_URL}/tasks`, taskData);
          alert('Задача успешно создана!');
        } catch (error) {
          console.error('Error creating task:', error);
          const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при создании задачи';
          alert(`Ошибка при создании задачи: ${errorMessage}`);
          throw error; // Пробрасываем ошибку дальше
        }
      }

      // Сброс формы
      setName('');
      setTag('');
      setDurationType('months');
      setStartMonth(AVAILABLE_MONTHS[0]);
      setEndMonth(AVAILABLE_MONTHS[0]);
      setStartDate('');
      setEndDate('');
      setEndTime('18:00');
      setSubtasks([{ name: '' }]);
      
      onTaskCreated();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} task:`, error);
      // Ошибка уже обработана выше для создания, здесь только для обновления
      if (isEditing) {
        const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при обновлении задачи';
        alert(`Ошибка при обновлении задачи: ${errorMessage}`);
      }
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card
        sx={{
          borderRadius: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
          mb: 3
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <CreateIcon sx={{ fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {isEditing ? 'Редактировать задачу' : 'Создать новую задачу'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {isEditing ? 'Обновите информацию о задаче' : 'Заполните форму для создания новой задачи'}
          </Typography>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 4,
          background: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Название задачи"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={availableProjects}
                  value={tag}
                  onInputChange={(event, newValue) => {
                    setTag(newValue);
                  }}
                  onChange={(event, newValue) => {
                    setTag(newValue || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Проект"
                      required
                      helperText="Выберите из списка или введите новый проект"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    p: 2
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={durationType === 'days'}
                        onChange={(e) => {
                          const newType = e.target.checked ? 'days' : 'months';
                          setDurationType(newType);
                          if (newType === 'days' && !startDate) {
                            const today = new Date().toISOString().split('T')[0];
                            setStartDate(today);
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setEndDate(tomorrow.toISOString().split('T')[0]);
                          }
                        }}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {durationType === 'days' ? 'Период по дням' : 'Период по месяцам'}
                      </Typography>
                    }
                  />
                  {durationType === 'months' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Доступные месяцы: {AVAILABLE_MONTHS.map(m => monthNames[m]).join(', ')}
                    </Typography>
                  )}
                  {durationType === 'days' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Для даты окончания по умолчанию устанавливается время 18:00
                    </Typography>
                  )}
                </Card>
              </Grid>

              {durationType === 'months' ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Месяц начала</InputLabel>
                      <Select
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        label="Месяц начала"
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        {AVAILABLE_MONTHS.map(month => (
                          <MenuItem key={month} value={month}>
                            {monthNames[month]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Месяц конца</InputLabel>
                      <Select
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                        label="Месяц конца"
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        {AVAILABLE_MONTHS.map(month => (
                          <MenuItem key={month} value={month}>
                            {monthNames[month]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Дата начала"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      InputLabelProps={{
                        shrink: true,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Дата окончания"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="По умолчанию время окончания: 18:00"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Время окончания"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 300, // 5 минут
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Card
                  sx={{
                    borderRadius: 3,
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    p: 3
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Подзадачи
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                    Подзадачи будут иметь ту же продолжительность, что и основная задача
                  </Typography>
                  
                  {subtasks.map((subtask, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        mb: 2, 
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: 'rgba(102, 126, 234, 0.03)',
                        border: '1px solid rgba(102, 126, 234, 0.1)'
                      }}
                    >
                      <TextField
                        fullWidth
                        label={`Подзадача ${index + 1}`}
                        value={subtask.name}
                        onChange={(e) => handleSubtaskChange(index, e.target.value)}
                        placeholder="Введите название подзадачи"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveSubtask(index)}
                        disabled={subtasks.length === 1}
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddSubtask}
                    variant="outlined"
                    sx={{ 
                      mt: 1,
                      borderRadius: 2,
                      borderColor: 'primary.main',
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.1)'
                      }
                    }}
                  >
                    Добавить подзадачу
                  </Button>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {isEditing && onCancelEdit && (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={onCancelEdit}
                      sx={{
                        borderRadius: 2,
                        px: 4
                      }}
                    >
                      Отмена
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                      }
                    }}
                  >
                    {isEditing ? 'Сохранить изменения' : 'Создать задачу'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default TaskForm;
