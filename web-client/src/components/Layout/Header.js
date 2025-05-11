import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Admin veya yetkili çalışan kontrolü
  const isAdmin = user && (user.role === 'admin' || user.role === 'municipal_worker');

  // Dropdown dışına tıklandığında dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    // Dinleyiciyi ekle
    document.addEventListener('mousedown', handleClickOutside);
    
    // Temizlik fonksiyonu
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Çıkış yapma işlemi başlatıldı');
    
    try {
      // Dropdown'ı kapat
      setIsDropdownOpen(false);
      // Çıkış işlemini çağır
      logout();
    } catch (error) {
      console.error('Çıkış yaparken bir hata oluştu:', error);
      // Hata olsa bile sayfayı yönlendir
      window.location.href = '/login';
    }
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Şehir Sorun Takip
        </Link>
        
        <nav>
          <ul className="flex space-x-6 items-center">
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
                {/* Admin veya yetkili çalışan ise yönetim paneli linki göster */}
                {isAdmin && (
                  <li>
                    <Link to="/admin" className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded transition">
                      Yönetim Paneli
                    </Link>
                  </li>
                )}
                <li className="relative" ref={dropdownRef}>
                  <button 
                    onClick={toggleDropdown}
                    className="hover:text-blue-200 transition focus:outline-none flex items-center"
                  >
                    {user?.name || 'Kullanıcı'}
                    <svg 
                      className={`ml-1 h-4 w-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 w-48 py-2 mt-2 bg-white rounded-md shadow-xl z-10">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Profil
                      </Link>
                      <Link
                        to="/my-issues"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Sorunlarım
                      </Link>
                      {/* Admin veya yetkili çalışan ise yönetim paneli linki göster */}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Yönetim Paneli
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                  )}
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