import React, { useState, useEffect } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api';

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    position: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/users`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        password: ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        full_name: '',
        position: '',
        password: ''
      });
    }
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      position: '',
      password: ''
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      if (editingUser) {
        // Обновление пользователя
        const updateData = {
          email: formData.email,
          full_name: formData.full_name,
          position: formData.position
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await axios.put(`${API_URL}/users/${editingUser.id}`, updateData, {
          headers: getAuthHeaders()
        });
        setSuccess('Пользователь успешно обновлен');
      } else {
        // Создание пользователя
        if (!formData.password) {
          setError('Пароль обязателен для нового пользователя');
          return;
        }
        await axios.post(`${API_URL}/users`, formData, {
          headers: getAuthHeaders()
        });
        setSuccess('Пользователь успешно создан');
      }

      setTimeout(() => {
        handleCloseDialog();
        fetchUsers();
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при сохранении пользователя');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: getAuthHeaders()
      });
      setSuccess('Пользователь успешно удален');
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при удалении пользователя');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Введите новый пароль:');
    if (!newPassword) return;

    try {
      await axios.post(
        `${API_URL}/users/${userId}/reset-password`,
        { new_password: newPassword },
        {
          headers: getAuthHeaders()
        }
      );
      setSuccess('Пароль успешно сброшен');
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при сбросе пароля');
    }
  };

  return (
    <Box>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Управление пользователями
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchUsers}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
                }}
              >
                Обновить
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
                }}
              >
                Добавить пользователя
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card
        sx={{
          borderRadius: 4,
          background: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>ФИО</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Должность</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Роль</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.position}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.is_super_admin ? (
                      <Chip label="Супер-админ" color="primary" size="small" />
                    ) : (
                      <Chip label="Пользователь" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <EditIcon />
                      </IconButton>
                      {!user.is_super_admin && (
                        <>
                          <IconButton
                            color="warning"
                            size="small"
                            onClick={() => handleResetPassword(user.id)}
                            title="Сбросить пароль"
                          >
                            <RefreshIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(user.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="ФИО"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Должность"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label={editingUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement;

