import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const WorkerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Üst Menü */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Şehir Sorun Takip Sistemi - Çalışan Paneli</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center">
                <span className="mr-2 text-sm hidden md:inline">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm"
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Alt Menü */}
        <div className="bg-blue-800">
          <div className="container mx-auto px-4">
            <nav className="flex">
              <NavLink
                to="/worker"
                end
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'
                  }`
                }
              >
                Gösterge Paneli
              </NavLink>
              <NavLink
                to="/worker/issues"
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'
                  }`
                }
              >
                Atanan Sorunlar
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Ana İçerik */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {/* Alt Bilgi */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Şehir Sorun Takip Sistemi - Tüm Hakları Saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default WorkerLayout; 