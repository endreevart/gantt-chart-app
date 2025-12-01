import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = 'http://localhost:8001/api';

// Доступные месяцы в порядке отображения
const AVAILABLE_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7]; // Декабрь, Январь, Февраль, Март, Апрель, Май, Июнь, Июль

const monthNames = {
  1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр',
  5: 'Май', 6: 'Июн', 7: 'Июл', 8: 'Авг',
  9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'
};

const monthNamesFull = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
};

function GanttChart({ tasks, onTasksUpdate, onEditTask }) {
  const ganttRef = useRef(null);
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Логирование для отладки
  useEffect(() => {
    console.log('GanttChart received tasks:', tasks.length, tasks);
  }, [tasks]);
  
  // Получаем список уникальных проектов
  const uniqueProjects = [...new Set(tasks.map(task => task.tag).filter(Boolean))].sort();
  
  // Фильтруем задачи по проекту и поисковому запросу
  const filteredTasks = tasks.filter(task => {
    const matchesProject = !filterProject || task.tag === filterProject;
    const matchesSearch = !searchQuery || 
      task.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });
  
  // Логирование отфильтрованных задач
  useEffect(() => {
    console.log('Filtered tasks:', filteredTasks.length, filteredTasks);
  }, [filteredTasks]);

  const isMonthInRange = (checkMonth, startMonth, endMonth) => {
    // Проверяем, находится ли месяц в диапазоне (с учетом циклического порядка)
    const startIdx = AVAILABLE_MONTHS.indexOf(startMonth);
    const endIdx = AVAILABLE_MONTHS.indexOf(endMonth);
    const checkIdx = AVAILABLE_MONTHS.indexOf(checkMonth);
    
    if (startIdx === -1 || endIdx === -1 || checkIdx === -1) {
      return false;
    }
    
    // Если диапазон не переходит через конец списка
    if (startIdx <= endIdx) {
      return startIdx <= checkIdx && checkIdx <= endIdx;
    }
    // Если диапазон переходит через конец списка (например, декабрь -> январь)
    else {
      return checkIdx >= startIdx || checkIdx <= endIdx;
    }
  };

  const handleExportPDF = async () => {
    if (!ganttRef.current) return;

    try {
      // Показываем индикатор загрузки
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
      loadingMessage.textContent = 'Генерация PDF... Пожалуйста, подождите';
      document.body.appendChild(loadingMessage);

      // Получаем элемент и его размеры
      const element = ganttRef.current;
      
      // Находим TableContainer внутри элемента
      const tableContainer = element.querySelector('.MuiTableContainer-root');
      
      // Сохраняем оригинальные стили
      const originalOverflow = element.style.overflow;
      const originalMaxHeight = element.style.maxHeight;
      const originalHeight = element.style.height;
      const originalTableOverflow = tableContainer ? tableContainer.style.overflow : '';
      const originalTableMaxHeight = tableContainer ? tableContainer.style.maxHeight : '';
      
      // Временно убираем ограничения для полного захвата
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';
      element.style.height = 'auto';
      if (tableContainer) {
        tableContainer.style.overflow = 'visible';
        tableContainer.style.maxHeight = 'none';
      }
      
      // Ждем небольшой момент для применения стилей
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Получаем реальные размеры после изменения стилей
      const elementHeight = element.scrollHeight || element.offsetHeight;
      const elementWidth = element.scrollWidth || element.offsetWidth;

      // Создаем canvas с оптимизированными настройками
      const canvas = await html2canvas(element, {
        scale: 1, // Уменьшаем scale для меньшего размера файла
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: elementWidth,
        height: elementHeight,
        backgroundColor: '#ffffff',
        removeContainer: true,
        allowTaint: false,
        imageTimeout: 30000,
        // Оптимизация для больших таблиц
        onclone: (clonedDoc) => {
          // Убеждаемся, что все элементы видимы в клоне
          const clonedElement = clonedDoc.querySelector('[data-gantt-table]');
          const clonedTableContainer = clonedElement?.querySelector('.MuiTableContainer-root');
          
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.height = 'auto';
          }
          if (clonedTableContainer) {
            clonedTableContainer.style.overflow = 'visible';
            clonedTableContainer.style.maxHeight = 'none';
          }
        }
      });
      
      // Восстанавливаем оригинальные стили
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;
      if (tableContainer) {
        tableContainer.style.overflow = originalTableOverflow;
        tableContainer.style.maxHeight = originalTableMaxHeight;
      }

      // Конвертируем в JPEG для меньшего размера (качество 0.75 для баланса размера и качества)
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      
      // Создаем PDF с автоматической пагинацией
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = 297; // A4 width in mm (landscape)
      const pdfHeight = 210; // A4 height in mm (landscape)
      const margin = 5; // Отступы
      const usableWidth = pdfWidth - (margin * 2);
      const usableHeight = pdfHeight - (margin * 2);
      
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      
      // Если изображение помещается на одну страницу
      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Разбиваем на несколько страниц
        let heightLeft = imgHeight;
        let position = 0;
        let pageNumber = 1;
        
        // Добавляем первую страницу
        pdf.addImage(imgData, 'JPEG', margin, margin + position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= usableHeight;
        position -= usableHeight;
        
        // Добавляем остальные страницы
        while (heightLeft > 0) {
          pdf.addPage();
          pageNumber++;
          pdf.addImage(imgData, 'JPEG', margin, margin + position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= usableHeight;
          position -= usableHeight;
        }
      }
      
      // Удаляем индикатор загрузки
      document.body.removeChild(loadingMessage);
      
      pdf.save('gantt-chart.pdf');
      alert('PDF успешно создан!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      // Удаляем индикатор загрузки в случае ошибки
      const loadingMessage = document.querySelector('div[style*="position: fixed"]');
      if (loadingMessage) {
        document.body.removeChild(loadingMessage);
      }
      alert('Ошибка при экспорте PDF: ' + error.message);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/export/csv`);
      let content = response.data.csv;
      const format = response.data.format || 'csv';
      
      let blob;
      let filename;
      let mimeType;
      
      if (format === 'html') {
        // Создаем HTML файл, который Excel может открыть с форматированием
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Задачи Gantt</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 5px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .subtask { font-weight: 300; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
        blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
        filename = 'tasks.html';
        mimeType = 'text/html';
      } else {
        // Стандартный CSV
        const BOM = '\uFEFF';
        content = BOM + content;
        blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        filename = 'tasks.csv';
        mimeType = 'text/csv';
      }
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (format === 'html') {
        alert('Файл сохранен в формате HTML. Откройте его в Excel для просмотра с форматированием (основные задачи будут жирными).');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Ошибка при экспорте CSV');
    }
  };

  const handleDeleteTask = async (taskId, taskName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить задачу "${taskName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      alert('Задача успешно удалена');
      onTasksUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Ошибка при удалении задачи');
    }
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/complete?completed=${!currentStatus}`);
      onTasksUpdate();
    } catch (error) {
      console.error('Error toggling task complete:', error);
      alert('Ошибка при обновлении статуса задачи');
    }
  };

  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Card
          sx={{
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" color="text.secondary">
            Нет задач. Создайте задачу на вкладке "Создать задачу"
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Заголовок и фильтры */}
      <Card
        sx={{
          borderRadius: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
          mb: 3
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <TextField
                placeholder="Поиск по названию задачи..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{
                  flex: '1 1 300px',
                  minWidth: 250,
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                    color: 'white',
                    height: '40px',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& input::placeholder': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      opacity: 1,
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl 
                size="small"
                sx={{ 
                  flex: '1 1 250px',
                  minWidth: 200,
                  maxWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                    height: '40px',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.7)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.9)',
                  },
                  '& .MuiSelect-icon': {
                    color: 'rgba(255, 255, 255, 0.9)',
                  }
                }}
              >
                <InputLabel>Фильтр по проекту</InputLabel>
                <Select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  label="Фильтр по проекту"
                >
                  <MenuItem value="">
                    <em>Все проекты</em>
                  </MenuItem>
                  {uniqueProjects.map(project => (
                    <MenuItem key={project} value={project}>
                      {project}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(filterProject || searchQuery) && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Показано: {filteredTasks.length} из {tasks.length} задач
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportPDF}
                sx={{
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                PDF
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportCSV}
                sx={{
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                CSV
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Таблица Gantt */}
      <Card
        sx={{
          borderRadius: 4,
          background: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}
        ref={ganttRef}
        data-gantt-table="true"
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Задача</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Проект</TableCell>
                {AVAILABLE_MONTHS.map((month, idx) => (
                  <TableCell key={`${month}-${idx}`} align="center" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                    {monthNamesFull[month]}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="center">Выполнено</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }} align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={AVAILABLE_MONTHS.length + 4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Нет задач для выбранного проекта
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  // Получаем значения из задачи с fallback значениями
                  // Определяем месяцы для отображения
                  let startMonth, endMonth;
                  if (task.duration_type === 'days' && task.start_date && task.end_date) {
                    // Для задач по дням конвертируем даты в месяцы
                    const startDate = new Date(task.start_date);
                    const endDate = new Date(task.end_date);
                    startMonth = startDate.getMonth() + 1; // getMonth() возвращает 0-11
                    endMonth = endDate.getMonth() + 1;
                    
                      // Проверяем, что месяцы входят в AVAILABLE_MONTHS, иначе используем ближайшие
                    if (!AVAILABLE_MONTHS.includes(startMonth)) {
                      // Находим ближайший доступный месяц
                      const sortedMonths = [...AVAILABLE_MONTHS].sort((a, b) => a - b);
                      startMonth = sortedMonths.find(m => m >= startMonth) || sortedMonths[0];
                    }
                    if (!AVAILABLE_MONTHS.includes(endMonth)) {
                      const sortedMonths = [...AVAILABLE_MONTHS].sort((a, b) => a - b);
                      endMonth = sortedMonths.reverse().find(m => m <= endMonth) || sortedMonths[0];
                    }
                  } else {
                    // Для задач по месяцам используем существующие поля
                    startMonth = (task.start_month !== undefined && task.start_month !== null) ? task.start_month : AVAILABLE_MONTHS[0];
                    endMonth = (task.end_month !== undefined && task.end_month !== null) ? task.end_month : AVAILABLE_MONTHS[0];
                  }
                  const isCompleted = task.completed || false;
                  
                  return (
                    <React.Fragment key={task.id}>
                      <TableRow
                        sx={{
                          opacity: isCompleted ? 0.6 : 1,
                          backgroundColor: isCompleted ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                          '&:hover': {
                            backgroundColor: isCompleted ? 'rgba(0, 0, 0, 0.04)' : 'rgba(102, 126, 234, 0.03)',
                          }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {isCompleted && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 1, verticalAlign: 'middle' }} />}
                          <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'text.secondary' : 'inherit' }}>
                            {task.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={task.tag} 
                            size="small" 
                            color={isCompleted ? 'default' : 'primary'}
                            sx={{
                              opacity: isCompleted ? 0.7 : 1
                            }}
                          />
                        </TableCell>
                        {AVAILABLE_MONTHS.map((month, idx) => {
                          const isInRange = isMonthInRange(month, startMonth, endMonth);
                          if (!isInRange) {
                            return <TableCell key={`${month}-${idx}`} align="center" />;
                          }
                          
                          // Для задач по дням вычисляем ширину полоски
                          let barWidth = '100%';
                          if (task.duration_type === 'days' && task.start_date && task.end_date) {
                            const startDate = new Date(task.start_date);
                            const endDate = new Date(task.end_date);
                            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                            const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                            
                            // Если задача в одном месяце и меньше месяца, делаем полоску пропорционально
                            if (startMonth === endMonth && daysDiff < daysInMonth) {
                              barWidth = `${(daysDiff / daysInMonth) * 100}%`;
                            }
                          }
                          
                          return (
                            <TableCell key={`${month}-${idx}`} align="center">
                              <Box
                                sx={{
                                  width: barWidth,
                                  height: 20,
                                  backgroundColor: isCompleted ? '#9e9e9e' : '#1976d2',
                                  borderRadius: 1,
                                  transition: 'all 0.2s',
                                  margin: '0 auto'
                                }}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell align="center">
                          <Checkbox
                            checked={isCompleted}
                            onChange={() => handleToggleComplete(task.id, isCompleted)}
                            sx={{
                              '&.Mui-checked': {
                                color: 'success.main',
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {onEditTask && (
                              <Tooltip title="Редактировать задачу">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => onEditTask(task)}
                                  sx={{
                                    borderRadius: 2,
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Удалить задачу">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteTask(task.id, task.name)}
                                sx={{
                                  borderRadius: 2,
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                      {task.subtasks?.map((subtask) => {
                        // Подзадачи наследуют даты от основной задачи, но могут иметь свои
                        // Для подзадач используем те же месяцы, что и у родительской задачи
                        let stStartMonth, stEndMonth;
                        if (task.duration_type === 'days' && task.start_date && task.end_date) {
                          // Подзадачи наследуют месяцы от родительской задачи
                          stStartMonth = startMonth;
                          stEndMonth = endMonth;
                        } else {
                          stStartMonth = subtask.start_month !== undefined && subtask.start_month !== null ? subtask.start_month : startMonth;
                          stEndMonth = subtask.end_month !== undefined && subtask.end_month !== null ? subtask.end_month : endMonth;
                        }
                        
                        return (
                          <TableRow 
                            key={subtask.id}
                            sx={{
                              opacity: isCompleted ? 0.5 : 0.8,
                              backgroundColor: isCompleted ? 'rgba(0, 0, 0, 0.01)' : 'transparent',
                            }}
                          >
                            <TableCell sx={{ pl: 4, color: 'text.secondary' }}>
                              └─ {subtask.name}
                            </TableCell>
                            <TableCell />
                            {AVAILABLE_MONTHS.map((month, idx) => (
                              <TableCell key={`${month}-${idx}`} align="center">
                                {isMonthInRange(month, stStartMonth, stEndMonth) && (
                                  <Box
                                    sx={{
                                      width: '100%',
                                      height: 20,
                                      backgroundColor: isCompleted ? '#bdbdbd' : '#42a5f5',
                                      borderRadius: 1
                                    }}
                                  />
                                )}
                              </TableCell>
                            ))}
                            <TableCell />
                            <TableCell />
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

export default GanttChart;
