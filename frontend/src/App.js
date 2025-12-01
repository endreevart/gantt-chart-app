import React, { useState, useEffect } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Chip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import TaskForm from './components/TaskForm';
import GanttChart from './components/GanttChart';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api';

// Настройка axios interceptor для добавления токена
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок авторизации
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // Список всех пользователей для супер-админа
  const [tabValue, setTabValue] = useState(0);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null); // Для супер-админа
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      // Всегда обновляем данные пользователя из API, чтобы получить актуальный ID
      const refreshUser = async () => {
        try {
          const response = await axios.get(`${API_URL}/auth/me`);
          const userData = response.data;
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          // По умолчанию показываем задачи текущего пользователя (включая супер-админа)
          setSelectedUserId(userData.id);
          fetchTasks(userData.id);
          if (userData.is_super_admin) {
            fetchUsers();
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
          // Если не удалось обновить, используем сохраненные данные
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setSelectedUserId(userData.id);
          fetchTasks(userData.id);
          if (userData.is_super_admin) {
            fetchUsers();
          }
        }
      };
      refreshUser();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async (userId = null) => {
    try {
      const params = userId ? { user_id: userId } : {};
      console.log('Fetching tasks with params:', params);
      const response = await axios.get(`${API_URL}/tasks`, { params });
      console.log('Tasks fetched:', response.data.length, 'tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    // По умолчанию показываем задачи текущего пользователя (включая супер-админа)
    setSelectedUserId(userData.id);
    fetchTasks(userData.id);
    if (userData.is_super_admin) {
      fetchUsers();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTasks([]);
    setTabValue(0);
  };

  const handleTaskCreated = () => {
    // После создания задачи обновляем список задач для текущего выбранного пользователя
    console.log('handleTaskCreated called, selectedUserId:', selectedUserId, 'user?.id:', user?.id);
    const userIdToFetch = selectedUserId || user?.id;
    console.log('Fetching tasks for userId:', userIdToFetch);
    fetchTasks(userIdToFetch);
    setEditingTask(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue !== 1) {
      setEditingTask(null);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTabValue(1); // Всегда переключаемся на вкладку "Создать задачу" для редактирования
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    fetchTasks(userId);
    setTabValue(0); // Переключаемся на дашборд
    setAnchorEl(null);
  };

  const handleViewAllTasks = () => {
    setSelectedUserId(null);
    fetchTasks();
    setTabValue(0);
    setAnchorEl(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isSuperAdmin = user.is_super_admin;

  return (
    <Box sx={{ flexGrow: 1, background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', minHeight: '100vh' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
          borderRadius: '0 0 24px 24px',
          mb: 3
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 3
            }}
          >
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Gantt Chart Управление Задачами
            </Typography>
            
            {isSuperAdmin && selectedUserId && selectedUserId !== user.id && (
              <Chip
                label={`Просмотр задач: ${users.find(u => u.id === selectedUserId)?.full_name || selectedUserId}`}
                sx={{ 
                  mr: 2,
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  '& .MuiChip-deleteIcon': {
                    color: 'white'
                  }
                }}
                onDelete={() => {
                  setSelectedUserId(user.id);
                  fetchTasks(user.id);
                }}
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isSuperAdmin && (
                <Button
                  startIcon={<PersonIcon />}
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    color: 'white',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  Выбрать пользователя
                </Button>
              )}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { 
                    background: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.3)' }}>
                  {user.full_name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                  {user.full_name}
                </Typography>
                {isSuperAdmin && (
                  <Chip 
                    label="Админ" 
                    size="small" 
                    sx={{
                      background: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                )}
              </Box>
              <Button
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                Выход
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem 
          onClick={() => {
            setSelectedUserId(user.id);
            fetchTasks(user.id);
            setAnchorEl(null);
          }}
          selected={selectedUserId === user.id}
        >
          Мои задачи
        </MenuItem>
        <MenuItem onClick={handleViewAllTasks}>
          Все задачи (общий дашборд)
        </MenuItem>
        <MenuItem disabled sx={{ fontWeight: 'bold', mt: 1 }}>
          Выбрать пользователя:
        </MenuItem>
        {users.filter(u => u.id !== user.id).map((u) => (
          <MenuItem
            key={u.id}
            onClick={() => handleUserSelect(u.id)}
            selected={selectedUserId === u.id}
          >
            {u.full_name} ({u.email})
          </MenuItem>
        ))}
      </Menu>
      
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Box
          sx={{
            background: 'white',
            borderRadius: 4,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            mb: 3,
            p: 1
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 2,
                mx: 0.5,
                minHeight: 48,
                transition: 'all 0.3s',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  color: '#667eea',
                },
                '&.Mui-selected': {
                  color: '#667eea',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                },
              },
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            <Tab label="Дашборд" />
            <Tab label="Создать задачу" />
            <Tab label="Gantt Диаграмма" />
            <Tab label="Календарь" />
            {isSuperAdmin && <Tab label="Управление пользователями" />}
            {isSuperAdmin && <Tab label="Настройки" />}
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <Dashboard tasks={tasks} />
        )}

        {/* Создать задачу */}
        {tabValue === 1 && (
          <TaskForm 
            onTaskCreated={handleTaskCreated} 
            editingTask={editingTask}
            onCancelEdit={handleCancelEdit}
            allTasks={tasks}
          />
        )}

        {/* Gantt Диаграмма */}
        {tabValue === 2 && (
          <GanttChart 
            tasks={tasks} 
            onTasksUpdate={() => fetchTasks(selectedUserId || user?.id)}
            onEditTask={handleEditTask}
          />
        )}

        {/* Календарный вид */}
        {tabValue === 3 && (
          <CalendarView tasks={tasks} />
        )}

        {/* Управление пользователями (только для супер-админа) */}
        {isSuperAdmin && tabValue === 4 && (
          <UserManagement currentUser={user} />
        )}

        {/* Настройки */}
        {tabValue === (isSuperAdmin ? 5 : 4) && (
          <Settings currentUser={user} onUpdate={handleUserUpdate} />
        )}
      </Container>
    </Box>
  );
}

export default App;
