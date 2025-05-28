import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Şehir Sorun Takip</h3>
            <p className="text-gray-300">
              Şehirde karşılaştığınız sorunları bildirebileceğiniz ve takip edebileceğiniz platform.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Bağlantılar</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link to="/issues" className="text-gray-300 hover:text-white transition">
                  Sorunlar
                </Link>
              </li>
              <li>
                <Link to="/report-issue" className="text-gray-300 hover:text-white transition">
                  Sorun Bildir
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition">
                  Hakkımızda
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">İletişim</h3>
            <ul className="space-y-2 text-gray-300">
              <li>Email: yeni-email@sehirsoruntakip.com</li>
              <li>Telefon: +90 (212) 987 65 43</li>
              <li>Adres: Yeni Adres Bilgisi, İstanbul</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Şehir Sorun Takip Sistemi. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 