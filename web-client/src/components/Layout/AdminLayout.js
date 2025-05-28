import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Aktif menü öğesi kontrolü
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Mobil menü toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-700 shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/admin" className="text-white text-xl font-bold">
              Yönetim Paneli
            </Link>
          </div>
          
          {/* Mobil menü butonu */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
          
          {/* Desktop menü */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-white hover:text-blue-200 text-sm">
              Siteye Dön
            </Link>
            <div className="text-white text-sm">
              <span className="mr-2">{user?.name}</span>
              <span className="bg-blue-800 px-2 py-1 rounded text-xs">
                {user?.role === 'admin' ? 'Yönetici' : 'Yetkili'}
              </span>
            </div>
            <button 
              onClick={logout} 
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobil menü */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-blue-800 text-white">
          <div className="container mx-auto px-4 py-2">
            <Link 
              to="/admin" 
              className={`block py-2 ${isActive('/admin') && !isActive('/admin/issues') && !isActive('/admin/reports') && !isActive('/admin/debug') ? 'font-bold' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/admin/issues" 
              className={`block py-2 ${isActive('/admin/issues') ? 'font-bold' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sorunlar
            </Link>
            <Link 
              to="/admin/reports" 
              className={`block py-2 ${isActive('/admin/reports') ? 'font-bold' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Raporlar
            </Link>
            <Link 
              to="/admin/debug" 
              className={`block py-2 ${isActive('/admin/debug') ? 'font-bold' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Çalışanlar
            </Link>
            <Link 
              to="/" 
              className="block py-2 border-t border-blue-700 mt-2 pt-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Siteye Dön
            </Link>
            <button 
              onClick={logout} 
              className="block w-full text-left py-2 text-red-300"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop only */}
        <aside className="hidden md:block w-64 bg-white shadow-md h-screen sticky top-0">
          <div className="p-4">
            <div className="mb-8">
              <div className="text-sm text-gray-500 mb-1">Hoş geldiniz,</div>
              <div className="font-semibold text-gray-800">{user?.name}</div>
              <div className="text-xs mt-1 bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                {user?.role === 'admin' ? 'Yönetici' : 'Yetkili'}
              </div>
            </div>
            
            <nav>
              <ul>
                <li className="mb-1">
                  <Link 
                    to="/admin" 
                    className={`flex items-center px-4 py-3 rounded-lg ${
                      isActive('/admin') && !isActive('/admin/issues') && !isActive('/admin/reports') && !isActive('/admin/debug')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                </li>
                <li className="mb-1">
                  <Link 
                    to="/admin/issues" 
                    className={`flex items-center px-4 py-3 rounded-lg ${
                      isActive('/admin/issues')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Sorunlar
                  </Link>
                </li>
                <li className="mb-1">
                  <Link 
                    to="/admin/reports" 
                    className={`flex items-center px-4 py-3 rounded-lg ${
                      isActive('/admin/reports')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Raporlar
                  </Link>
                </li>
                <li className="mb-1">
                  <Link 
                    to="/admin/debug" 
                    className={`flex items-center px-4 py-3 rounded-lg ${
                      isActive('/admin/debug')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Çalışanlar
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 