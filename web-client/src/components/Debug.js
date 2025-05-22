import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';

const Debug = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);
        const response = await adminService.getWorkers();
        console.log('Workers API response:', response);
        
        if (response && response.data) {
          setWorkers(response.data);
        } else {
          setError('API yanıtında veri bulunamadı');
        }
      } catch (err) {
        console.error('Workers yüklenirken hata:', err);
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Debug: Worker Listesi</h2>
      
      {loading && (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Yükleniyor...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Hata:</strong> {error}</p>
        </div>
      )}
      
      {!loading && !error && workers.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <p>Çalışan bulunamadı.</p>
        </div>
      )}
      
      {!loading && !error && workers.length > 0 && (
        <div>
          <p className="mb-2">Toplam {workers.length} çalışan bulundu:</p>
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İsim
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şehir
                </th>
                <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departman
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker, index) => (
                <tr key={worker._id || index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">{worker.name}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">{worker.email}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">{worker.role}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">{worker.city}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-sm">{worker.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Debug; 