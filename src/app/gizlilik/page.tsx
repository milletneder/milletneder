import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';

export const metadata = {
  title: 'Gizlilik Politikası',
  description: '#MilletNeDer gizlilik politikası ve kişisel verilerin korunması hakkında bilgi.',
};

export default function GizlilikPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-6 pb-16">
        <PageHero
          title="Gizlilik Politikası"
          subtitle="Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi."
          backLink={{ href: '/', label: 'Ana Sayfa' }}
        />

        <div className="space-y-10 mt-10">
          {/* Genel */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">1. Genel Bilgi</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              MilletNeDer (milletneder.com), bağımsız bir üniversite projesi olarak faaliyet gösteren
              çevrimiçi bir anket platformudur. Bu gizlilik politikası, platformumuzu kullanırken
              kişisel verilerinizin nasıl toplandığını, işlendiğini ve korunduğunu açıklamaktadır.
            </p>
          </section>

          {/* Toplanan Veriler */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">2. Toplanan Veriler</h2>
            <div className="space-y-4">
              <div className="border border-neutral-200 p-4">
                <h3 className="text-sm font-semibold text-black mb-2">Hesap Bilgileri</h3>
                <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                  <li>E-posta adresi (hesap oluşturma ve iletişim için)</li>
                  <li>Şifre (tek yönlü şifrelenerek saklanır)</li>
                  <li>İl ve ilçe bilgisi (demografik analiz için)</li>
                </ul>
              </div>
              <div className="border border-neutral-200 p-4">
                <h3 className="text-sm font-semibold text-black mb-2">Telefon Doğrulama</h3>
                <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                  <li>Telefon numaranız yalnızca doğrulama amacıyla kullanılır</li>
                  <li>Numaranız tek yönlü hash ile saklanır, orijinal hali sistemimizde tutulmaz</li>
                  <li>Telefon numaranız kimliğinizle, oyunuzla veya diğer kişisel bilgilerinizle eşleştirilmez</li>
                  <li>Doğrulama işlemi Twilio Verify altyapısı üzerinden gerçekleştirilir</li>
                </ul>
              </div>
              <div className="border border-neutral-200 p-4">
                <h3 className="text-sm font-semibold text-black mb-2">Oy Verileri</h3>
                <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                  <li>Parti tercihiniz anonim olarak kaydedilir</li>
                  <li>Oy değişiklik geçmişi şeffaflık amacıyla tutulur</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Verilerin Kullanımı */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">3. Verilerin Kullanımı</h2>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Hesap oluşturma ve kimlik doğrulama</li>
              <li>Mükerrer oy kullanımını engelleme</li>
              <li>Anonim istatistiksel analiz ve raporlama</li>
              <li>Platform güvenliğinin sağlanması</li>
            </ul>
            <p className="text-sm text-neutral-600 mt-3">
              Verileriniz hiçbir koşulda üçüncü taraflarla pazarlama amacıyla paylaşılmaz.
            </p>
          </section>

          {/* Veri Güvenliği */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">4. Veri Güvenliği</h2>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Tüm iletişim SSL/TLS şifrelemesi ile korunmaktadır</li>
              <li>Şifreler bcrypt algoritması ile tek yönlü hashlenmektedir</li>
              <li>Telefon numaraları SHA-256 ile hashlenip saklanır, orijinal numara tutulmaz</li>
              <li>Veritabanı erişimi kısıtlı ve yetkilendirilmiştir</li>
            </ul>
          </section>

          {/* Çerezler */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">5. Çerezler</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Platformumuz yalnızca oturum yönetimi için gerekli teknik çerezleri kullanmaktadır.
              Reklam veya izleme amaçlı üçüncü taraf çerezleri kullanılmamaktadır.
            </p>
          </section>

          {/* Haklar */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">6. Haklarınız</h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-3">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmiş ise buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
            </ul>
          </section>

          {/* İletişim */}
          <section>
            <h2 className="text-lg font-bold text-black mb-3">7. İletişim</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Gizlilik politikamız hakkında sorularınız için bize ulaşabilirsiniz:
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
