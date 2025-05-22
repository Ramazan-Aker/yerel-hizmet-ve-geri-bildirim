/**
 * Worker servisi - çalışanlara özel API fonksiyonları
 */
workerService = {
  // Çalışana atanan sorunları getir
  getAssignedIssues: async () => {
    try {
      const response = await client.get('/worker/issues');
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Atanan sorunlar alınamadı');
    }
  },
  
  // Çalışana atanan sorunu detayıyla getir
  getIssueById: async (id) => {
    try {
      const response = await client.get(`/worker/issues/${id}`);
      
      // Yanıt içerisindeki id kontrolü ve veri doğrulama
      const issueData = response.data.data;
      if (issueData) {
        // Municipal worker rolünde API yetki sorunu olduğu için admin/users/:id çağrısı yapmak yerine
        // assignedWorker alanını direkt olarak kullan
        if (issueData.assignedWorker) {
          // Eğer assignedWorker bir ID ise, object olmadığı anlamına gelir
          if (typeof issueData.assignedWorker === 'string') {
            // API çağrısı yapmadan doğrudan object oluştur
            issueData.assignedWorker = { 
              _id: issueData.assignedWorker,
              name: 'Atanmış Çalışan'
            };
          }
          // Zaten object ise olduğu gibi kullan
        }
      }

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Sorun detayları alınamadı');
    }
  },
  
  // ... remaining code ...
}; 