import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  currentUser: any;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-3xl">🎵</div>
              <div>
                <h1 className="text-2xl font-bold">appHarmonia</h1>
                <p className="text-gray-600 text-sm">Correcció de partitures d'harmonia</p>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium">{currentUser.nom_display || currentUser.nom_usuari}</p>
                  <p className="text-sm text-gray-500 capitalize">{currentUser.rol}</p>
                </div>
                
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-bold text-blue-600">
                    {(currentUser.nom_display || currentUser.nom_usuari).charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Sortir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;