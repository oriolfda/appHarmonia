import React, { useState } from 'react';
import { authAPI } from '../services/api';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [nomUsuari, setNomUsuari] = useState('');
  const [nomDisplay, setNomDisplay] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Les contrasenyes no coincideixen');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authAPI.register(email, nomUsuari, password, nomDisplay || nomUsuari);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'Error en el registre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">🎵 Registrar-se</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">
            Email *
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

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="nomUsuari">
            Nom d'usuari *
          </label>
          <input
            id="nomUsuari"
            type="text"
            value={nomUsuari}
            onChange={(e) => setNomUsuari(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="nomDisplay">
            Nom per mostrar
          </label>
          <input
            id="nomDisplay"
            type="text"
            value={nomDisplay}
            onChange={(e) => setNomDisplay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={nomUsuari}
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="password">
            Contrasenya *
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

        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
            Confirma la contrasenya *
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Creant compte...' : 'Crear Compte'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-gray-600">
          Ja tens compte?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Inicia sessió aquí
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;