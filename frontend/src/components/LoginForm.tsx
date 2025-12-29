import React, { useState } from 'react';
import { authAPI } from '../services/api';

interface LoginFormProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">🎵 Iniciar Sessió</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="password">
            Contrasenya
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Iniciant sessió...' : 'Iniciar Sessió'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-gray-600">
          No tens compte?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Registra't aquí
          </button>
        </p>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-1">Credencials de prova:</p>
        <p>Admin: admin@harmonia.cat / admin123</p>
        <p>Professor: professor@harmonia.cat / professor123</p>
      </div>
    </div>
  );
};

export default LoginForm;