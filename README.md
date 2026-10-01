# 🚀 Apple Connect AI Deliver (GitHub Action & CLI)

Claude, Codex / OpenAI ve Gemini yapay zeka modelleriyle tam uyumlu, iOS mobil uygulamalarınız için otomatik App Store güncelleme notları ("What's New") ve mağaza metaverisi üreten, doğrudan **App Store Connect REST API**'ye güvenli şekilde aktaran yeni nesil GitHub Action ve CLI aracı.

Fastlane'e alternatif olarak harici Ruby veya Fastlane bağımlılığı gerektirmeden çalışır, aynı zamanda Fastlane kullanan projeler için metaverileri `fastlane/metadata/` klasörüne de eşzamanlı olarak yedekleyebilir.

---

## 🌟 Öne Çıkan Özellikler

- 🤖 **3 Büyük AI Desteği**: Google Gemini (varsayılan: `gemini-2.0-flash`), Anthropic Claude (varsayılan: `claude-3-7-sonnet-20250219`) veya OpenAI / Codex (varsayılan: `gpt-4o`).
- 🍎 **Doğrudan App Store Connect API**: Fastlane veya Ruby kurmadan, resmi Apple App Store Connect REST API v1 ile JWT (ES256) tabanlı doğrudan entegrasyon.
- 📦 **Akıllı Git Analizi**: Son sürüm etiketinden (tag) veya belirtilen commit aralığından Conventional Commits (`feat:`, `fix:`, `perf:`) analiz edilir ve teknik terimler son kullanıcı dostu metinlere dönüştürülür.
- 🛡️ **Apple App Review Standartlarına Uyum**:
  - Rakip platform isimleri (Android, Google Play vb.) asla kullanılmaz (Apple ret sebebi engellenir).
  - Jira/Linear ID'leri, dahili commit SHA'ları filtrelenir.
  - 4000 karakterlik Apple sınırına tam uyum sağlanır.
- 🌍 **Çoklu Dil (Localization)**: Tek seferde `en-US`, `tr`, `de-DE`, `ja`, `es-ES` gibi dillerde doğal ve akıcı yerelleştirilmiş güncelleme notları üretir.
- 📝 **Farklı Ton ve Stiller**:
  - `bullet-points`: Temiz, profesyonel madde imleri (•)
  - `emojis`: Modern, ilgi çekici emojilerle zenginleştirilmiş maddeler (✨, 🚀, 🛠️)
  - `minimal`: 2-3 cümlelik sade ve vurucu özet
  - `detailed`: Başlıklı kapsamlı sürüm notları (Yenilikler, İyileştirmeler, Düzeltmeler)
- 🧪 **Dry-Run (Test) Modu**: PR kontrollerinde veya yerel testlerde App Store'a dokunmadan AI çıktısını önizleme imkanı.
- 💻 **Hem GitHub Action Hem CLI**: Hem GitHub CI/CD akışlarında hem de yerel terminalde `npx appstore-ai` olarak çalışır.

---

## 📋 Hızlı Başlangıç (GitHub Actions)

### 1. GitHub Secrets Tanımlayın

GitHub deponuzun **Settings > Secrets and variables > Actions** sayfasına aşağıdaki anahtarları ekleyin:

| Secret Adı | Açıklama |
| :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API anahtarı (veya `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) |
| `APP_STORE_APP_ID` | Apple App Store Connect'teki uygulamanızın sayısal App ID'si (ör. `6451234567`) |
| `APP_STORE_KEY_ID` | App Store Connect API Key ID (ör. `2X9R4HXF34`) |
| `APP_STORE_ISSUER_ID` | App Store Connect Issuer ID (UUID formatında) |
| `APP_STORE_PRIVATE_KEY` | Apple'dan indirilen `.p8` API özel anahtarının içeriği |

> 💡 **Apple API Key Nasıl Alınır?**: [App Store Connect](https://appstoreconnect.apple.com/) > **Users and Access** > **Integrations** > **App Store Connect API** sekmesinden "App Manager" veya "Admin" yetkisiyle yeni bir API Key oluşturup `.p8` dosyasını indirin.

---

### 2. Workflow Dosyası Oluşturun (`.github/workflows/appstore-release.yml`)

```yaml
name: "App Store AI Release Notes"

on:
  push:
    tags:
      - 'v*' # Yeni bir sürüm etiketi atıldığında tetiklenir (ör. v1.2.0)
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (App Store'a göndermeden önizle)"
        type: boolean
        default: false

jobs:
  update-metadata:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Git commit ve etiket geçmişini okumak için gereklidir

      - name: Generate & Update App Store Release Notes
        uses: ./ # veya your-username/apple-store-ai-action@v1
        with:
          provider: 'gemini' # 'gemini' | 'claude' | 'openai'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          app_id: ${{ secrets.APP_STORE_APP_ID }}
          asc_key_id: ${{ secrets.APP_STORE_KEY_ID }}
          asc_issuer_id: ${{ secrets.APP_STORE_ISSUER_ID }}
          asc_private_key: ${{ secrets.APP_STORE_PRIVATE_KEY }}
          locales: 'en-US,tr'
          style: 'bullet-points' # 'bullet-points', 'emojis', 'minimal', 'detailed'
          dry_run: ${{ github.event.inputs.dry_run || 'false' }}
          save_to_disk: 'fastlane/metadata' # İsteğe bağlı yerel yedekleme
```

---

## 🛠️ Parametreler ve Ayarlar

| Parametre | Zorunlu? | Varsayılan | Açıklama |
| :--- | :---: | :---: | :--- |
| `provider` | Hayır | `gemini` | Kullanılacak yapay zeka: `gemini`, `claude`, `openai` |
| `model` | Hayır | Model varsayılanı | Özel model adı (ör. `gemini-2.0-flash`, `claude-3-7-sonnet-20250219`, `gpt-4o`) |
| `api_key` | Evet | - | AI sağlayıcısının API anahtarı |
| `app_id` | Evet* | - | Apple App Store Connect App ID (*dry-run haricinde zorunlu) |
| `asc_key_id` | Evet* | - | App Store Connect API Key ID |
| `asc_issuer_id`| Evet* | - | App Store Connect API Issuer ID |
| `asc_private_key`| Evet* | - | App Store Connect `.p8` özel anahtarı (düz metin veya base64) |
| `version` | Hayır | Otomatik | Hedef sürüm (ör. `1.3.0`). Belirtilmezse App Store'da `PREPARE_FOR_SUBMISSION` durumundaki sürümü bulur |
| `locales` | Hayır | `en-US` | Virgülle ayrılmış dil kodları (ör. `en-US,tr,de-DE,ja`) |
| `style` | Hayır | `bullet-points` | Çıktı stili: `bullet-points`, `emojis`, `minimal`, `detailed` |
| `git_since` | Hayır | `auto` | Commit analiz başlangıcı (`auto` son tag'i alır, veya `HEAD~15`, `v1.2.0`) |
| `app_context` | Hayır | - | Uygulama hakkında AI'a ek bilgi (ör. "Finans ve bütçe takip uygulaması") |
| `dry_run` | Hayır | `false` | `true` yapılırsa App Store Connect'e istek atmadan sonucu loglar |
| `mode`         | Hayır | `release-notes-only` | `release-notes-only` (sadece yenilikler) veya `full-storefront` (100 char ASO anahtar kelimeler, 30 char alt başlık, tanıtım metni, açıklama) |
| `app_category` | Hayır | - | ASO anahtar kelime optimizasyonu için kategori (ör. `Health & Fitness`, `Finance`, `Productivity`) |
| `github_token` | Hayır | `${{ github.token }}` | PR önizleme yorumu için GitHub token |
| `pr_comment`   | Hayır | `true` | PR açıldığında otomatik yapışkan önizleme yorumu ekleme/güncelleme |
| `webhook_url`  | Hayır | - | Slack veya Discord webhook bildirim adresi |

---

## 🎯 ASO (App Store Optimization) & Tam Mağaza Metaverisi

`mode: 'full-storefront'` modunu kullanarak uygulamanızın sadece sürüm notlarını değil, tüm mağaza listelemesini Apple kurallarına sıfır hatayla uyumlu şekilde oluşturabilirsiniz:

* **Anahtar Kelimeler (Keywords)**: Apple'ın katı **100 karakter sınırına** tam uyum sağlar. Boşluksuz, sadece virgülle ayrılmış, tekrar etmeyen ve ASO arama hacmi yüksek kelimeler üretilir.
* **Alt Başlık (Subtitle)**: Apple'ın **30 karakter sınırını** aşmayan vurucu sloganlar.
* **Tanıtım Metni (Promotional Text)**: **170 karakterlik** dinamik tanıtım alanı.
* **Açıklama (Description)**: Madde imleri, sosyal kanıtlar ve özellik listeleriyle zenginleştirilmiş mağaza açıklaması.

```yaml
      - uses: blgymtr/apple-connect-ai-deliver@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          app_id: ${{ secrets.APP_STORE_APP_ID }}
          asc_key_id: ${{ secrets.APP_STORE_KEY_ID }}
          asc_issuer_id: ${{ secrets.APP_STORE_ISSUER_ID }}
          asc_private_key: ${{ secrets.APP_STORE_PRIVATE_KEY }}
          mode: 'full-storefront' # 🌟 Tam mağaza metaverisi modu
          app_category: 'Health & Fitness'
          locales: 'en-US,tr,de-DE'
          save_to_disk: 'fastlane/metadata'
```

## 💬 Pull Request (PR) Önizleme Botu

Bir geliştirici `main` dalına PR açtığında veya PR'a yeni commit gönderdiğinde, AI otomatik olarak değişiklikleri inceler ve PR'ın altına şık bir önizleme yorumu bırakır. Yeni commit geldikçe spama yol açmadan mevcut yorumu günceller (**Sticky Comment**).

```yaml
name: "App Store AI PR Preview"

on:
  pull_request:
    branches: [main, master]

permissions:
  contents: read
  pull-requests: write # PR'a yorum yazabilmek için gereklidir

jobs:
  pr-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: blgymtr/apple-connect-ai-deliver@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          dry_run: 'true'
          pr_comment: 'true'
          github_token: ${{ secrets.GITHUB_TOKEN }}
          locales: 'en-US,tr'
```

---

## 📢 Slack & Discord Webhook Bildirimleri

Yeni bir sürüm yayınlandığında veya PR onaylandığında ekibinize otomatik bildirim göndermek için `webhook_url` parametresini tanımlamanız yeterlidir:

```yaml
      - uses: blgymtr/apple-connect-ai-deliver@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          app_id: ${{ secrets.APP_STORE_APP_ID }}
          asc_key_id: ${{ secrets.APP_STORE_KEY_ID }}
          asc_issuer_id: ${{ secrets.APP_STORE_ISSUER_ID }}
          asc_private_key: ${{ secrets.APP_STORE_PRIVATE_KEY }}
          webhook_url: ${{ secrets.SLACK_OR_DISCORD_WEBHOOK }}
```

## 💻 Yerel CLI Kullanımı

GitHub Action dışında, yerel bilgisayarınızda veya CI/CD scriptlerinizde doğrudan terminalden de çalıştırabilirsiniz:

```bash
# Önizleme (Dry-run)
npx appstore-ai \
  --provider gemini \
  --api-key AIzaSy... \
  --locales "en-US,tr" \
  --style emojis \
  --dry-run

# Doğrudan App Store Connect'e aktarma
npx appstore-ai \
  --provider claude \
  --api-key sk-ant-... \
  --app-id "6451234567" \
  --key-id "2X9R4HXF34" \
  --issuer-id "550e8400-e29b-41d4-a716-446655440000" \
  --private-key "$(cat AuthKey_2X9R4HXF34.p8)" \
  --locales "en-US,tr"
```

---

## 📁 Proje Dizin Yapısı

```
apple-store-ai-action/
├── action.yml                 # GitHub Action manifestosu
├── package.json               # Paket ve derleme ayarları
├── tsconfig.json              # TypeScript yapılandırması
├── src/
│   ├── index.ts               # GitHub Action ana giriş noktası
│   ├── cli.ts                 # CLI aracı giriş noktası
│   ├── runner.ts              # İş akışı orkestrasyonu
│   ├── config.ts              # Parametre ve env çözümleyici
│   ├── types.ts               # Tip tanımları
│   ├── ai/
│   │   ├── factory.ts         # Gemini / Claude / OpenAI fabrika katmanı
│   │   ├── gemini.ts          # Google Gemini sağlayıcısı
│   │   ├── claude.ts          # Anthropic Claude sağlayıcısı
│   │   ├── openai.ts          # OpenAI / Codex sağlayıcısı
│   │   └── prompts.ts         # Apple Review odaklı sistem promptları & JSON ayrıştırıcı
│   ├── apple/
│   │   ├── auth.ts            # Node.js yerel crypto ile ES256 JWT üretici
│   │   └── client.ts          # App Store Connect REST API istemcisi
│   ├── git/
│   │   └── commits.ts         # Git geçmişi ve Conventional Commits ayrıştırıcı
│   └── utils/
│       ├── logger.ts          # GitHub Action ve terminal loglayıcı
│       └── exporter.ts        # Fastlane metadata formatında disk kaydı
├── test/                      # Node.js test paketi
│   ├── auth.test.ts           # JWT ES256 imza doğrulama testleri
│   ├── prompts.test.ts        # Prompt ve JSON ayrıştırma testleri
│   └── runner.test.ts         # Uçtan uca dry-run boru hattı testi
└── dist/                      # Dağıtıma hazır tekil bundle (ncc)
```

---

## 🧪 Testleri Çalıştırma

```bash
npm test
```

Tüm testler Node.js'in yerleşik test çalıştırıcısı (`node:test`) ve `tsx` ile bağımsız olarak saniyeden kısa sürede tamamlanır.

---

## 📄 Lisans

MIT License.
