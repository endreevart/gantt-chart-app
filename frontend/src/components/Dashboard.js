import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Assignment as TaskIcon,
  List as SubtaskIcon,
  Category as TagIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';

const monthNames = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
};

const AVAILABLE_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7];

function Dashboard({ tasks }) {
  // Общая статистика
  const totalTasks = tasks.length;
  const totalSubtasks = tasks.reduce((sum, task) => sum + (task.subtasks?.length || 0), 0);
  
  // Уникальные проекты
  const uniqueTags = [...new Set(tasks.map(task => task.tag))];
  const tagCounts = {};
  tasks.forEach(task => {
    tagCounts[task.tag] = (tagCounts[task.tag] || 0) + 1;
  });
  
  // Распределение задач по месяцам
  const monthDistribution = {};
  AVAILABLE_MONTHS.forEach(month => {
    monthDistribution[month] = 0;
  });
  
  tasks.forEach(task => {
    const startMonth = task.start_month;
    const endMonth = task.end_month;
    const startIdx = AVAILABLE_MONTHS.indexOf(startMonth);
    const endIdx = AVAILABLE_MONTHS.indexOf(endMonth);
    
    if (startIdx !== -1 && endIdx !== -1) {
      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          monthDistribution[AVAILABLE_MONTHS[i]]++;
        }
      } else {
        // Переход через конец списка (декабрь -> январь)
        for (let i = startIdx; i < AVAILABLE_MONTHS.length; i++) {
          monthDistribution[AVAILABLE_MONTHS[i]]++;
        }
        for (let i = 0; i <= endIdx; i++) {
          monthDistribution[AVAILABLE_MONTHS[i]]++;
        }
      }
    }
  });
  
  // Статистика по длительности задач
  const getTaskDuration = (task) => {
    const startIdx = AVAILABLE_MONTHS.indexOf(task.start_month);
    const endIdx = AVAILABLE_MONTHS.indexOf(task.end_month);
    
    if (startIdx === -1 || endIdx === -1) return 0;
    
    if (startIdx <= endIdx) {
      return endIdx - startIdx + 1;
    } else {
      return (AVAILABLE_MONTHS.length - startIdx) + (endIdx + 1);
    }
  };
  
  const taskDurations = tasks.map(getTaskDuration);
  const maxDuration = taskDurations.length > 0 ? Math.max(...taskDurations) : 0;
  const minDuration = taskDurations.length > 0 ? Math.min(...taskDurations) : 0;
  
  // Повторяющиеся задачи (длятся 2 и более месяцев)
  const longTasks = tasks.filter(task => {
    const duration = getTaskDuration(task);
    return duration >= 2;
  });

  // Находим самый загруженный месяц
  const maxMonthCount = Math.max(...Object.values(monthDistribution), 0);
  const busiestMonth = Object.entries(monthDistribution).find(([_, count]) => count === maxMonthCount);
  const busiestMonthName = busiestMonth ? monthNames[parseInt(busiestMonth[0])] : '';

  // Вычисление эффективности
  const calculateEfficiency = () => {
    const now = new Date();
    let onTime = 0; // В срок
    let overdue = 0; // Просроченные
    let early = 0; // Выполненные заранее
    let inProgress = 0; // В процессе

    tasks.forEach(task => {
      if (task.completed) {
        // Для завершенных задач проверяем, были ли они выполнены в срок или заранее
        let endDate;
        if (task.duration_type === 'days' && task.end_date) {
          const [year, month, day] = task.end_date.split('-').map(Number);
          const [hours, minutes] = (task.end_time || '18:00').split(':').map(Number);
          endDate = new Date(year, month - 1, day, hours, minutes);
        } else if (task.duration_type === 'months' && task.end_month) {
          // Для месячного режима берем последний день месяца
          const currentYear = now.getFullYear();
          const monthIdx = AVAILABLE_MONTHS.indexOf(task.end_month);
          const month = task.end_month;
          const lastDay = new Date(currentYear, month, 0).getDate();
          endDate = new Date(currentYear, month - 1, lastDay, 23, 59);
        } else {
          return; // Пропускаем задачи без даты окончания
        }

        // Используем дату завершения из задачи, если есть, иначе текущую дату
        let completedDate = now;
        if (task.completed_at) {
          completedDate = new Date(task.completed_at);
        }
        if (completedDate <= endDate) {
          early++;
        } else {
          onTime++;
        }
      } else {
        // Для незавершенных задач проверяем, просрочены ли они
        let endDate;
        if (task.duration_type === 'days' && task.end_date) {
          const [year, month, day] = task.end_date.split('-').map(Number);
          const [hours, minutes] = (task.end_time || '18:00').split(':').map(Number);
          endDate = new Date(year, month - 1, day, hours, minutes);
        } else if (task.duration_type === 'months' && task.end_month) {
          const currentYear = now.getFullYear();
          const month = task.end_month;
          const lastDay = new Date(currentYear, month, 0).getDate();
          endDate = new Date(currentYear, month - 1, lastDay, 23, 59);
        } else {
          return;
        }

        if (now > endDate) {
          overdue++;
        } else {
          inProgress++;
        }
      }
    });

    const total = tasks.length;
    const efficiency = total > 0 ? ((onTime + early) / total * 100).toFixed(1) : 0;
    
    return { onTime, overdue, early, inProgress, total, efficiency };
  };

  const efficiencyStats = calculateEfficiency();

  // Советы по повышению эффективности
  const getEfficiencyAdvice = () => {
    const { efficiency, overdue, early, total } = efficiencyStats;
    const advice = [];

    if (parseFloat(efficiency) < 70) {
      const neededEarly = Math.ceil((total * 0.7 - (efficiencyStats.onTime + early)) / 0.3);
      advice.push({
        type: 'warning',
        text: `Для достижения эффективности 70% необходимо выполнить ${neededEarly > 0 ? neededEarly : 0} задач заранее срока`
      });
    }

    if (overdue > 0) {
      advice.push({
        type: 'error',
        text: `У вас ${overdue} просроченных задач. Рекомендуется завершить их в ближайшее время`
      });
    }

    if (early < total * 0.2) {
      advice.push({
        type: 'info',
        text: `Попробуйте выполнить больше задач заранее срока. Это повысит вашу эффективность`
      });
    }

    if (parseFloat(efficiency) >= 80) {
      advice.push({
        type: 'success',
        text: `Отличная работа! Ваша эффективность ${efficiency}%. Продолжайте в том же духе!`
      });
    }

    return advice;
  };

  const advice = getEfficiencyAdvice();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        Сводная аналитика
      </Typography>

      <Grid container spacing={2}>
        {/* Дашборд эффективности - в самом верху */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
              mb: 2,
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 15px 40px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TrendingIcon sx={{ fontSize: 40 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Эффективность выполнения задач
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress
                      variant="determinate"
                      value={parseFloat(efficiencyStats.efficiency)}
                      size={120}
                      thickness={4}
                      sx={{
                        color: 'white',
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        }
                      }}
                    />
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {efficiencyStats.efficiency}%
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Общая эффективность
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <CheckCircleIcon sx={{ fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {efficiencyStats.onTime}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            В срок
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <ScheduleIcon sx={{ fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {efficiencyStats.early}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Заранее
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <WarningIcon sx={{ fontSize: 32, mb: 1, color: '#ffeb3b' }} />
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {efficiencyStats.overdue}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Просрочено
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <TaskIcon sx={{ fontSize: 32, mb: 1 }} />
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {efficiencyStats.inProgress}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            В процессе
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Советы по повышению эффективности */}
        {advice.length > 0 && (
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 4,
                background: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <LightbulbIcon sx={{ fontSize: 32, color: '#ffc107' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Рекомендации по повышению эффективности
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {advice.map((item, index) => (
                    <Alert
                      key={index}
                      severity={
                        item.type === 'error' ? 'error' :
                        item.type === 'warning' ? 'warning' :
                        item.type === 'success' ? 'success' : 'info'
                      }
                      icon={
                        item.type === 'error' ? <WarningIcon /> :
                        item.type === 'warning' ? <WarningIcon /> :
                        item.type === 'success' ? <CheckCircleIcon /> : <LightbulbIcon />
                      }
                      sx={{
                        borderRadius: 2,
                        '& .MuiAlert-message': {
                          width: '100%'
                        }
                      }}
                    >
                      {item.text}
                    </Alert>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Карточка: Всего задач */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 15px 40px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Всего задач
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {totalTasks}
                  </Typography>
                </Box>
                <TaskIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Подзадачи */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 15px 40px rgba(245, 87, 108, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Всего подзадач
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {totalSubtasks}
                  </Typography>
                </Box>
                <SubtaskIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Проекты */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 15px 40px rgba(79, 172, 254, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Проектов
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {uniqueTags.length}
                  </Typography>
                </Box>
                <TagIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Повторяющиеся задачи */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              boxShadow: '0 10px 30px rgba(250, 112, 154, 0.3)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 15px 40px rgba(250, 112, 154, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Повторяющиеся
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {longTasks.length}
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Большая карточка: Распределение по месяцам */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Распределение задач по месяцам
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {AVAILABLE_MONTHS.map(month => {
                  const count = monthDistribution[month];
                  const percentage = totalTasks > 0 ? (count / totalTasks * 100) : 0;
                  return (
                    <Box key={month}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" fontWeight={500}>
                          {monthNames[month]}
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="primary">
                          {count} {count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'grey.100',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                          }
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Статистика */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              boxShadow: '0 4px 20px rgba(168, 237, 234, 0.3)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(168, 237, 234, 0.4)'
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                Статистика длительности
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Минимум
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {minDuration}
                    <Typography component="span" variant="body2" sx={{ ml: 0.5, opacity: 0.7 }}>
                      мес.
                    </Typography>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Максимум
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {maxDuration}
                    <Typography component="span" variant="body2" sx={{ ml: 0.5, opacity: 0.7 }}>
                      мес.
                    </Typography>
                  </Typography>
                </Box>
                {busiestMonthName && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Самый загруженный месяц
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      {busiestMonthName}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Проекты */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Распределение по проектам
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {uniqueTags.map(tag => (
                  <Chip
                    key={tag}
                    label={`${tag} (${tagCounts[tag]})`}
                    sx={{
                      height: 36,
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      }
                    }}
                  />
                ))}
                {uniqueTags.length === 0 && (
                  <Typography color="text.secondary">
                    Нет задач с проектами
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Карточка: Повторяющиеся задачи */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 4,
              background: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Повторяющиеся задачи
                </Typography>
                <Chip
                  label={longTasks.length}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Задачи, которые длятся 2 и более месяцев
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto' }}>
                {longTasks.length > 0 ? (
                  longTasks.map(task => {
                    const duration = getTaskDuration(task);
                    const startMonthName = monthNames[task.start_month];
                    const endMonthName = monthNames[task.end_month];
                    return (
                      <Box
                        key={task.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                          border: '1px solid rgba(102, 126, 234, 0.2)',
                          transition: 'all 0.2s',
                          '&:hover': {
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                            borderColor: 'rgba(102, 126, 234, 0.4)',
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight={600} gutterBottom>
                              {task.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              <Chip label={task.tag} size="small" color="primary" />
                              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                {startMonthName} - {endMonthName}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              ml: 2,
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {duration} {duration === 1 ? 'мес.' : duration < 5 ? 'мес.' : 'мес.'}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Нет повторяющихся задач
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

export default Dashboard;
