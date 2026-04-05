import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';

export const metadata = {
  title: 'Kullanım Koşulları',
  description: '#MilletNeDer platformunun kullanım koşulları ve kuralları.',
};

export default function KullanimKosullariPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-6 pb-16">
        <PageHero
          title="Kullanım Koşulları"
          subtitle="MilletNeDer platformunu kullanmadan önce lütfen bu koşulları okuyun."
          backLink={{ href: '/', label: 'Ana Sayfa' }}
        />

        <div className="space-y-10 mt-10">
          {/* Genel */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">1. Genel Hükümler</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              MilletNeDer (milletneder.com), bağımsız bir üniversite projesi olarak geliştirilen
              çevrimiçi bir anket platformudur. Platformu kullanarak bu kullanım koşullarını
              kabul etmiş sayılırsınız. Herhangi bir siyasi parti, kuruluş veya devlet kurumu
              ile bağlantımız bulunmamaktadır.
            </p>
          </section>

          {/* Hizmet Tanımı */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">2. Hizmet Tanımı</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Platform, kullanıcıların siyasi tercihlerini anonim olarak paylaşabilecekleri
              bir anket ortamı sunmaktadır. Sonuçlar istatistiksel yöntemlerle ağırlıklandırılarak
              kamuoyuna sunulur. Platform resmi bir seçim veya referandum niteliği taşımamaktadır.
            </p>
          </section>

          {/* Hesap ve Kayıt */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">3. Hesap ve Kayıt</h2>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Her kullanıcı yalnızca bir hesap oluşturabilir</li>
              <li>Telefon doğrulaması zorunludur ve mükerrer hesap oluşturmayı engellemek amacıyla yapılır</li>
              <li>Kayıt sırasında verilen bilgilerin doğru olması gerekmektedir</li>
              <li>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz</li>
            </ul>
          </section>

          {/* Oy Kullanma */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">4. Oy Kullanma Kuralları</h2>
            <div className="border border-neutral-200 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-black mb-1">Oy Hakkı</h3>
                <p className="text-sm text-neutral-600">
                  Her doğrulanmış kullanıcı, aktif anket döneminde bir oy kullanma hakkına sahiptir.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black mb-1">Oy Değiştirme</h3>
                <p className="text-sm text-neutral-600">
                  Kullanıcılar, aktif dönem içinde oylarını sınırlı sayıda değiştirebilir.
                  Tüm değişiklikler şeffaflık amacıyla kayıt altına alınır.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black mb-1">Oy Gizliliği</h3>
                <p className="text-sm text-neutral-600">
                  Oyunuz gizlidir. Hiçbir koşulda bireysel oy bilgileri kamuya açıklanmaz.
                </p>
              </div>
            </div>
          </section>

          {/* Yasaklar */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">5. Yasaklanan Davranışlar</h2>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Birden fazla hesap oluşturmak</li>
              <li>Başkası adına oy kullanmak</li>
              <li>Otomatik araçlar (bot) kullanarak oy kullanmak veya hesap oluşturmak</li>
              <li>Platformun güvenliğini tehlikeye atacak girişimlerde bulunmak</li>
              <li>Diğer kullanıcıların haklarını ihlal etmek</li>
            </ul>
            <p className="text-sm text-neutral-600 mt-3">
              Bu kurallara uymayan hesaplar uyarılmadan askıya alınabilir veya kalıcı olarak
              engellenebilir.
            </p>
          </section>

          {/* Sorumluluk Sınırlaması */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">6. Sorumluluk Sınırlaması</h2>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Platform sonuçları tahmin niteliğindedir, kesin sonuç olarak değerlendirilmemelidir</li>
              <li>Platform kesintisiz veya hatasız çalışma garantisi vermemektedir</li>
              <li>Kullanıcıların platform üzerinden yaptıkları tercihlerden doğabilecek sonuçlardan platform sorumlu tutulamaz</li>
            </ul>
          </section>

          {/* Fikri Mülkiyet */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">7. Fikri Mülkiyet</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Platformun tasarımı, logosu, yazılımı ve içerikleri fikri mülkiyet hakları ile
              korunmaktadır. İzinsiz kopyalama, dağıtma veya değiştirme yasaktır.
              Anket sonuçları kaynak belirtilerek paylaşılabilir.
            </p>
          </section>

          {/* Değişiklikler */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">8. Koşullarda Değişiklik</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Bu kullanım koşulları önceden bildirimde bulunmaksızın güncellenebilir.
              Güncellemeler yayınlandığı tarihten itibaren geçerli olur.
              Platformu kullanmaya devam etmeniz, güncellenmiş koşulları kabul ettiğiniz anlamına gelir.
            </p>
          </section>

          {/* İletişim */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">9. İletişim</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Kullanım koşulları hakkında sorularınız için bize ulaşabilirsiniz:
            </p>
            <div className="border border-neutral-200 p-4 mt-3">
              <p className="text-sm text-neutral-600">
                <strong>E-posta:</strong> iletisim@milletneder.com
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                <strong>Platform:</strong> milletneder.com
              </p>
            </div>
          </section>

          {/* Son güncelleme */}
          <div className="border-t border-neutral-200 pt-6">
            <p className="text-xs text-neutral-400">
              Son güncelleme: 31 Mart 2026
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
