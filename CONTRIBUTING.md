# Katkıda Bulunma Rehberi

#MilletNeDer'e katkıda bulunmak istediğiniz için teşekkürler!

## Nasıl Katkıda Bulunabilirsiniz

### Hata Bildirimi

1. [Issues](https://github.com/milletneder/milletneder/issues) sayfasında mevcut bir bildirim olup olmadığını kontrol edin
2. Yoksa yeni bir issue açın ve şunları belirtin:
   - Hatanın kısa açıklaması
   - Tekrarlama adımları
   - Beklenen davranış vs gerçekleşen davranış
   - Tarayıcı ve işletim sistemi bilgisi

### Kod Katkısı

1. Repoyu fork edin
2. Yeni bir branch oluşturun: `git checkout -b ozellik/kisa-aciklama`
3. Değişikliklerinizi yapın
4. Lint ve build kontrolü yapın:
   ```bash
   npm run lint
   npm run build
   ```
5. Değişikliklerinizi commit edin: `git commit -m "feat: kısa açıklama"`
6. Branch'inizi push edin: `git push origin ozellik/kisa-aciklama`
7. Pull Request açın (`main` branch'e)

### Commit Mesajı Kuralları

[Conventional Commits](https://www.conventionalcommits.org/) formatını kullanın:

- `feat:` — Yeni özellik
- `fix:` — Hata düzeltmesi
- `docs:` — Dokümantasyon değişikliği
- `refactor:` — Kod düzenlemesi (özellik/hata değil)
- `test:` — Test ekleme/düzenleme
- `chore:` — Build, CI, bağımlılık güncellemesi

### Pull Request Kuralları

- PR açıklamasında değişikliğin amacını belirtin
- Mümkünse ilgili issue numarasını referans verin (`Fixes #123`)
- PR'ınız CI kontrollerinden (lint + build) geçmelidir
- Bir maintainer inceleyip onayladıktan sonra merge edilir

## Geliştirme Ortamı

```bash
# Fork'u klonla
git clone https://github.com/KULLANICI_ADIN/milletneder.git
cd milletneder

# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env.local

# Geliştirme sunucusunu başlat
npm run dev
```

Detaylı kurulum rehberi için [README.md](README.md) dosyasına bakın.

## Davranış Kuralları

- Saygılı ve yapıcı olun
- Farklı görüşlere açık olun
- Topluluk üyelerine yardımcı olun

## Lisans

Katkılarınız projenin [AGPL-3.0](LICENSE) lisansı altında yayınlanacaktır.
