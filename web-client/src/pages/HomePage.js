import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const stats = [
    { id: 1, name: 'Toplam Sorun', value: '2,500+' },
    { id: 2, name: 'Çözümlenen Sorunlar', value: '1,830+' },
    { id: 3, name: 'Aktif Kullanıcılar', value: '5,000+' },
    { id: 4, name: 'Ortalama Çözüm Süresi', value: '3 gün' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-blue-600 text-white py-16 rounded-lg mb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Şehir Sorunlarını Bildirin ve Takip Edin
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Yaşadığınız şehirdeki sorunları hızlıca bildirin ve çözüm sürecini adım adım takip edin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/report-issue"
              className="bg-white text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-lg font-medium transition"
            >
              Sorun Bildir
            </Link>
            <Link
              to="/issues"
              className="bg-blue-700 text-white hover:bg-blue-800 px-6 py-3 rounded-lg font-medium transition"
            >
              Sorunları Görüntüle
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Nasıl Çalışır?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold mb-3">Sorun Bildirin</h3>
            <p className="text-gray-600">
              Şehrinizde karşılaştığınız altyapı, ulaşım, çevre veya diğer sorunları detaylı bir şekilde bildirin.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold mb-3">Takip Edin</h3>
            <p className="text-gray-600">
              Bildirdiğiniz sorunun durumunu ve çözüm sürecini gerçek zamanlı olarak takip edin.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold mb-3">Sonuçları Görün</h3>
            <p className="text-gray-600">
              Sorunların çözüldüğünü görün ve daha yaşanabilir bir şehir oluşumuna katkıda bulunun.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-12 rounded-lg mb-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Rakamlarla Platformumuz</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.id} className="text-center">
                <dt className="text-lg font-medium text-gray-500">{stat.name}</dt>
                <dd className="mt-2 text-3xl font-extrabold text-blue-600">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-700 text-white p-12 rounded-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Şehrinizi İyileştirmeye Yardımcı Olun</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Yaşadığınız sorunları bildirerek şehrinizin daha yaşanabilir olmasına katkıda bulunun.
          </p>
          <Link
            to="/register"
            className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-lg font-medium text-lg transition inline-block"
          >
            Hemen Kaydolun
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;