import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authAPI } from './services/api';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PartituraUploader from './components/PartituraUploader';
import PartituraViewer from './components/PartituraViewer';
import PartituresList from './components/PartituresList';
import Header from './components/Header';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authAPI.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(authAPI.getCurrentUser());
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      authAPI.getProfile().then(data => {
        setCurrentUser(data.user);
      }).catch(() => {
        authAPI.logout();
        setIsAuthenticated(false);
        setCurrentUser(null);
      });
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authAPI.getCurrentUser());
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleUploadSuccess = () => {
    // Es pot usar per refrescar la llista si és necessari
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        {showLogin ? (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setShowLogin(false)}
          />
        ) : (
          <RegisterForm
            onRegisterSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setShowLogin(true)}
          />
        )}
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  <PartituraUploader onUploadSuccess={handleUploadSuccess} />
                </div>
                <div className="lg:col-span-3">
                  <PartituresList />
                </div>
              </div>
            } />
            
            <Route path="/partitura/:id" element={<PartituraViewer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm">
            <p>🎵 appHarmonia - Correcció col·laborativa de partitures d'harmonia</p>
            <p className="mt-1">v1.0.0 • Desenvolupat amb React, Node.js i SQLite</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;