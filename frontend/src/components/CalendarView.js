import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Paper,
  Tooltip,
  Button,
  IconButton
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const monthNames = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
};

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Генерируем уникальные цвета для задач
const generateTaskColors = (tasks) => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
    '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140',
    '#30cfd0', '#330867', '#a8edea', '#fed6e3', '#ff9a9e',
    '#fecfef', '#fecfef', '#ffecd2', '#fcb69f', '#ff8a80'
  ];
  
  const taskColorMap = {};
  tasks.forEach((task, index) => {
    taskColorMap[task.id] = colors[index % colors.length];
  });
  return taskColorMap;
};

function CalendarView({ tasks }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef(null);

  // Генерируем цвета для задач
  const taskColors = useMemo(() => generateTaskColors(tasks), [tasks]);

  // Получаем все дни с задачами
  const getDaysWithTasks = () => {
    const daysMap = {}; // { 'YYYY-MM-DD': [task1, task2, ...] }
    const currentYear = currentDate.getFullYear();

    tasks.forEach(task => {
      if (task.duration_type === 'days' && task.start_date && task.end_date) {
        // Для режима дней
        const start = new Date(task.start_date);
        const end = new Date(task.end_date);
        
        // Добавляем время окончания если есть
        if (task.end_time) {
          const [hours, minutes] = task.end_time.split(':').map(Number);
          end.setHours(hours, minutes);
        } else {
          end.setHours(18, 0); // По умолчанию 18:00
        }

        const current = new Date(start);
        while (current <= end) {
          const dateKey = current.toISOString().split('T')[0];
          if (!daysMap[dateKey]) {
            daysMap[dateKey] = [];
          }
          daysMap[dateKey].push(task);
          current.setDate(current.getDate() + 1);
        }
      } else if (task.duration_type === 'months' && task.start_month && task.end_month) {
        // Для режима месяцев - показываем каждый день месяца
        const AVAILABLE_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7];
        
        const startMonth = task.start_month;
        const endMonth = task.end_month;
        const startIdx = AVAILABLE_MONTHS.indexOf(startMonth);
        const endIdx = AVAILABLE_MONTHS.indexOf(endMonth);
        
        if (startIdx !== -1 && endIdx !== -1) {
          let monthsToShow = [];
          
          if (startIdx <= endIdx) {
            for (let i = startIdx; i <= endIdx; i++) {
              monthsToShow.push(AVAILABLE_MONTHS[i]);
            }
          } else {
            // Переход через конец списка (декабрь -> январь)
            for (let i = startIdx; i < AVAILABLE_MONTHS.length; i++) {
              monthsToShow.push(AVAILABLE_MONTHS[i]);
            }
            for (let i = 0; i <= endIdx; i++) {
              monthsToShow.push(AVAILABLE_MONTHS[i]);
            }
          }

          monthsToShow.forEach((month, monthIndex) => {
            // Определяем год для месяца на основе текущего отображаемого месяца в календаре
            // Используем год из currentDate, который может быть установлен пользователем
            const calendarYear = currentDate.getFullYear();
            let year = calendarYear;
            
            // Если месяц декабрь (12) и мы в начале года, возможно это предыдущий год
            // Если месяц январь (1) и мы в конце года, возможно это следующий год
            if (startIdx > endIdx) {
              // Переход через конец списка (декабрь -> январь)
              if (monthIndex < AVAILABLE_MONTHS.length - startIdx) {
                // Месяцы до конца списка (декабрь) - текущий год календаря
                year = calendarYear;
              } else {
                // Месяцы после перехода (январь и далее) - следующий год
                year = calendarYear + 1;
              }
            } else {
              // Обычный диапазон без перехода
              // Используем год календаря для всех месяцев
              year = calendarYear;
            }

            // Получаем все дни месяца
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month - 1, day);
              const dateKey = date.toISOString().split('T')[0];
              if (!daysMap[dateKey]) {
                daysMap[dateKey] = [];
              }
              // Проверяем, что задача еще не добавлена в этот день
              if (!daysMap[dateKey].some(t => t.id === task.id)) {
                daysMap[dateKey].push(task);
              }
            }
          });
        }
      }
    });

    return daysMap;
  };

  const daysWithTasks = getDaysWithTasks();

  // Получаем календарь для текущего месяца
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11 (0 = январь, 11 = декабрь)
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // getDay() возвращает: 0=воскресенье, 1=понедельник, ..., 6=суббота
    // Нам нужно: 0=понедельник, 1=вторник, ..., 6=воскресенье
    // Преобразуем: воскресенье (0) -> 6, понедельник (1) -> 0, вторник (2) -> 1, и т.д.
    const dayOfWeek = firstDay.getDay();
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Понедельник = 0

    const days = [];
    
    // Добавляем пустые ячейки для дней до начала месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      
      days.push({
        day,
        date,
        dateKey,
        tasks: daysWithTasks[dateKey] || []
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTaskColor = (taskId) => {
    return taskColors[taskId] || '#667eea';
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;

    try {
      // Показываем индикатор загрузки
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
      loadingMessage.textContent = 'Генерация PDF календаря... Пожалуйста, подождите';
      document.body.appendChild(loadingMessage);

      const element = calendarRef.current;
      
      // Сохраняем оригинальные стили
      const originalOverflow = element.style.overflow;
      const originalMaxHeight = element.style.maxHeight;
      const originalHeight = element.style.height;
      
      // Временно убираем ограничения для полного захвата
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';
      element.style.height = 'auto';
      
      // Ждем небольшой момент для применения стилей
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        allowTaint: false,
        imageTimeout: 30000,
      });

      // Восстанавливаем оригинальные стили
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;

      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const usableWidth = pdfWidth - 2 * margin;
      const usableHeight = pdfHeight - 2 * margin;

      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Разбиваем на несколько страниц
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', margin, margin + position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= usableHeight;
        position -= usableHeight;
        
        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, margin + position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= usableHeight;
          position -= usableHeight;
        }
      }
      
      // Удаляем индикатор загрузки
      document.body.removeChild(loadingMessage);

      pdf.save(`calendar-${monthNames[currentDate.getMonth() + 1]}-${currentDate.getFullYear()}.pdf`);
      alert('Календарь успешно экспортирован в PDF!');
    } catch (error) {
      console.error('Error exporting calendar PDF:', error);
      const loadingMessage = document.querySelector('div[style*="position: fixed"]');
      if (loadingMessage) {
        document.body.removeChild(loadingMessage);
      }
      alert('Ошибка при экспорте календаря: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card
        sx={{
          borderRadius: 4,
          background: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          mb: 3
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={handlePrevMonth}
                sx={{
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                  }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#667eea' }}>
                {monthNames[currentDate.getMonth() + 1]} {currentDate.getFullYear()}
              </Typography>
              
              <IconButton
                onClick={handleNextMonth}
                sx={{
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                  }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportPDF}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                }
              }}
            >
              Экспорт PDF
            </Button>
          </Box>

          {/* Заголовки дней недели */}
          <Grid container spacing={1} sx={{ mb: 1, display: 'flex', flexWrap: 'nowrap' }}>
            {dayNames.map((dayName, index) => (
              <Grid 
                item 
                xs={12/7} 
                key={index} 
                sx={{ 
                  display: 'flex',
                  flex: '0 0 calc(14.285% - 8px)',
                  maxWidth: 'calc(14.285% - 8px)'
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: 2,
                    fontWeight: 600,
                    color: '#667eea',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {dayName}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Календарная сетка */}
          <Box ref={calendarRef}>
            <Grid container spacing={1} sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {calendarDays.map((dayData, index) => (
                <Grid 
                  item 
                  xs={12/7} 
                  key={index} 
                  sx={{ 
                    minHeight: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '0 0 calc(14.285% - 8px)',
                    maxWidth: 'calc(14.285% - 8px)'
                  }}
                >
                  {dayData ? (
                    <Paper
                      sx={{
                        p: 1.5,
                        height: '100%',
                        minHeight: 160,
                        borderRadius: 3,
                        background: dayData.tasks.length > 0 
                          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                          : 'white',
                        border: dayData.tasks.length > 0 
                          ? '2px solid rgba(102, 126, 234, 0.2)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.3s',
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        }
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          color: dayData.tasks.length > 0 ? '#667eea' : 'text.secondary',
                          flexShrink: 0,
                          textAlign: 'left'
                        }}
                      >
                        {dayData.day}
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 0.5,
                          flex: 1,
                          overflow: 'hidden',
                          overflowY: 'auto',
                          minHeight: 0,
                          width: '100%',
                          '&::-webkit-scrollbar': {
                            width: '4px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(102, 126, 234, 0.3)',
                            borderRadius: '2px',
                          }
                        }}
                      >
                        {dayData.tasks.length > 0 ? (
                          dayData.tasks.map((task) => {
                            return (
                              <Tooltip
                                key={task.id}
                                title={
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {task.name}
                                    </Typography>
                                    <Typography variant="caption">
                                      Проект: {task.tag}
                                    </Typography>
                                    {task.completed && (
                                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                        ✓ Выполнено
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                arrow
                              >
                                <Box
                                  sx={{
                                    background: getTaskColor(task.id),
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    minHeight: 24,
                                    maxWidth: '100%',
                                    width: '100%',
                                    borderRadius: 2,
                                    p: 0.5,
                                    px: 1,
                                    cursor: 'pointer',
                                    opacity: task.completed ? 0.6 : 1,
                                    textDecoration: task.completed ? 'line-through' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    hyphens: 'auto',
                                    lineHeight: 1.2,
                                    boxSizing: 'border-box',
                                    '&:hover': {
                                      opacity: 0.8,
                                      transform: 'scale(1.02)'
                                    }
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'white',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      lineHeight: 1.3,
                                      wordBreak: 'break-word',
                                      overflowWrap: 'break-word',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      width: '100%',
                                      textAlign: 'left'
                                    }}
                                  >
                                    {task.name}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            );
                          })
                        ) : (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.disabled',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              mt: 1,
                              opacity: 0.5
                            }}
                          >
                            Нет задач
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  ) : (
                    <Paper
                      sx={{
                        p: 1.5,
                        height: '100%',
                        minHeight: 160,
                        borderRadius: 3,
                        background: 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Легенда с задачами */}
      {tasks.length > 0 && (
        <Card
          sx={{
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#667eea' }}>
              Легенда задач
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {tasks.map((task) => (
                <Chip
                  key={task.id}
                  label={task.name}
                  sx={{
                    background: getTaskColor(task.id),
                    color: 'white',
                    fontWeight: 600,
                    opacity: task.completed ? 0.6 : 1,
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default CalendarView;

