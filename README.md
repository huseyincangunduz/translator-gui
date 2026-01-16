# Translator GUI

Angular ve TypeScript projelerindeki string literalleri bulan, çeviri JSON dosyalarına ekleyen ve otomatik kod güncellemesi yapan Electron GUI uygulaması.

## Özellikler

- ✅ TypeScript ve HTML dosyalarında string tarama
- ✅ String'leri listeleme ve filtreleme
- ✅ Çeviri JSON dosyalarını yükleme ve güncelleme
- ✅ Otomatik kod güncelleme (HTML'de `translate` pipe, TypeScript'te `translate.instant()`)
- ✅ Modern ve kullanıcı dostu GUI

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
# Projeyi derle ve çalıştır
npm run dev

# Değişiklikleri izle (watch mode)
npm run watch
```

## Build

```bash
# Tüm dosyaları derle
npm run build

# Uygulamayı çalıştır
npm start

# Platform bazlı paketleme
npm run package:linux
npm run package:win
npm run package:mac
```

## Kullanım

1. **Proje Klasörü Seç**: Angular/TypeScript projenizin ana klasörünü seçin
2. **Tara**: String literalleri bulmak için projeyi tarayın
3. **JSON Dosyası Seç**: Çeviri JSON dosyanızı yükleyin
4. **String Seç**: Listeden çevirmek istediğiniz string'i seçin
5. **Çeviri Ekle**: Prefix ve key girerek çeviriyi ekleyin ve kodu güncelleyin

## JSON Formatı

```json
[
  {
    "prefix": "lotus.books",
    "stringMap": {
      "question-book": "Soru kitabı",
      "questions": "Sorular"
    }
  }
]
```

## Proje Yapısı

```
translator-gui/
├── src/
│   ├── main/          # Electron ana process
│   │   └── main.ts
│   ├── renderer/      # GUI (HTML/CSS/TypeScript)
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── app.ts
│   │   └── preload.ts
│   └── shared/        # Paylaşılan tipler/utils
├── dist/              # Derlenmiş dosyalar
└── release/           # Paketlenmiş uygulamalar
```

## Lisans

MIT
