import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api';

function Settings({ currentUser, onUpdate }) {
  const [formData, setFormData] = useState({
    new_email: currentUser?.email || '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    try {
      const updateData = {};
      if (formData.new_email !== currentUser.email) {
        updateData.new_email = formData.new_email;
      }
      if (formData.new_password) {
        updateData.new_password = formData.new_password;
      }

      await axios.put(
        `${API_URL}/auth/update-credentials`,
        updateData,
        {
          headers: getAuthHeaders()
        }
      );

      setSuccess('Данные успешно обновлены');
      
      // Обновляем информацию о пользователе
      const userResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      onUpdate(userResponse.data);

      // Очищаем поля паролей
      setFormData({
        ...formData,
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при обновлении данных');
    } finally {
      setLoading(false);
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon sx={{ fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Настройки
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 4,
          background: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
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

          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Изменить логин и пароль
            </Typography>

            <TextField
              fullWidth
              label="Новый Email (логин)"
              type="email"
              value={formData.new_email}
              onChange={(e) => setFormData({ ...formData, new_email: e.target.value })}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Новый пароль"
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Оставьте пустым, чтобы не менять пароль"
            />

            <TextField
              fullWidth
              label="Подтвердите новый пароль"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                borderRadius: 2,
                px: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                }
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Settings;

