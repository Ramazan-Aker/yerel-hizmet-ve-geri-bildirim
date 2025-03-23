import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Şehir Sorun Takip
        </Link>
        
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="hover:text-blue-200 transition">
                Ana Sayfa
              </Link>
            </li>
            <li>
              <Link to="/issues" className="hover:text-blue-200 transition">
                Sorunlar
              </Link>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/report-issue" className="hover:text-blue-200 transition">
                    Sorun Bildir
                  </Link>
                </li>
                <li className="relative group">
                  <button className="hover:text-blue-200 transition focus:outline-none">
                    {user?.name || 'Kullanıcı'}
                  </button>
                  <div className="absolute right-0 w-48 py-2 mt-2 bg-white rounded-md shadow-xl hidden group-hover:block z-10">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                    >
                      Profil
                    </Link>
                    <Link
                      to="/my-issues"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                    >
                      Sorunlarım
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" className="hover:text-blue-200 transition">
                    Giriş Yap
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-blue-200 transition">
                    Kaydol
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header; 