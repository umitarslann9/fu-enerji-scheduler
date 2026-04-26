# Fu Enerji Scheduler — Frontend

Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui tabanlı ders programı yönetim arayüzü.

## Başlatma

```bash
npm install
npm run dev
# → http://localhost:3000
```

Backend `http://localhost:8000` üzerinde çalışıyor olmalı.  
Farklı adres için: `NEXT_PUBLIC_API_URL=http://...` env var.

## Sayfalar

- `/` — Dashboard: 4 stat kart + son program durumu + demo veri yükleme
- `/teachers` — Öğretmen listesi, ekle/düzenle/sil, müsaitlik matrisi, boş saat sayacı
- `/classrooms` — Sınıf listesi (grade + section + öğrenci sayısı)
- `/subjects` — Ders listesi, branş-öğretmen senkronu, sınıf ataması
- `/schedule` — Ders programı: sınıf dropdown + renkli haftalık grid + PDF
- `/teacher-schedule` — Öğretmen programı: öğretmen dropdown (alfabetik) + haftalık grid + PDF

## Tasarım

Inter font · zinc nötr paleti · blue-600 accent · dark mode (next-themes) · golden-angle timetable renkleri

## Build

```bash
npm run build
npm start
```
