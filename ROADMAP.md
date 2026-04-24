Fu Enerji Case Study — Ders Programı Çizelgeleme Uygulaması
> **Süre:** 2 gün
> **Stack:** Next.js (App Router) + FastAPI + Greedy/Backtracking Scheduler
> **Deploy:** Vercel (tek platform)
---
🎯 Problem Özeti (Kendi Cümlemle)
Bir okul idarecisi için haftalık ders programı üreten bir web uygulaması. Kullanıcı öğretmen, sınıf, ders ve zaman dilimi tanımlar; sistem kısıtlara uyan bir program üretip görselleştirir.
Bu bir Constraint Satisfaction Problem (CSP). NP-hard sınıfında, ama küçük okul ölçeğinde (≤20 sınıf, ≤40 öğretmen) backtracking ile kabul edilebilir sürede çözülür.
---
📐 Mimari Karar Özeti
Katman	Seçim	Gerekçe
Frontend	Next.js 14 (App Router)	SSR, hızlı routing, Vercel uyumu
UI	Tailwind + shadcn/ui	Hızlı, profesyonel görünüm
Backend	FastAPI (Python)	Pydantic validation, async, mülakatta anlatması kolay
DB	SQLite (local) / None (in-memory)	Auth yok → persistence minimum
Scheduler	Greedy + Backtracking	Kendim yazabilirim, kararları savunabilirim
Deploy	Vercel (frontend) + Vercel Python Functions veya Railway (backend)	Tek platform hedefi
---
🗓️ 2 Günlük Plan
GÜN 1 — Temel Mimari + Algoritma
Adım 1: Proje İskeleti (1-1.5 saat)
[ ] Monorepo yapısı kur: `frontend/` + `backend/`
[ ] Next.js 14 (App Router, TypeScript, Tailwind) init
[ ] FastAPI + Poetry/uv init, klasör yapısı
[ ] README taslağı (boş başlıklar)
[ ] `.gitignore`, `.env.example`
Adım 2: Veri Modeli (1 saat)
Pydantic modelleri tanımla:
`Teacher` (id, name, availability: List[TimeSlot])
`Classroom` (id, name, grade)
`Subject` (id, name, weekly_hours, teacher_id)
`TimeSlot` (day: 1-5, period: 1-8)
`Lesson` (subject_id, classroom_id, teacher_id, time_slot)
`Schedule` (lessons: List[Lesson])
Karar: Önce JSON dosya tabanlı persistence, zaman kalırsa SQLite.
Adım 3: Scheduler Algoritması (3-4 saat) ⭐ Projenin kalbi
```
1. Tüm atanması gereken (subject, classroom) çiftlerini listele
   — weekly_hours'a göre expand et
2. MRV heuristic: En kısıtlı olan dersten başla (en az uygun slot'u olan)
3. Her ders için:
   - Öğretmenin müsait olduğu slot'ları filtrele
   - Sınıfın boş olduğu slot'ları filtrele
   - Öğretmenin o slot'ta başka sınıfı olmadığını kontrol et
4. Backtrack: Çözüm bulunamazsa bir önceki karara geri dön
5. Optimizasyon (opsiyonel): Aynı dersin aynı güne kümelenmemesi
```
[ ] Unit testler yaz (3-4 basit senaryo + 1 infeasible)
[ ] Conflict detection fonksiyonu ayrı
Adım 4: API Endpoint'leri (1.5 saat)
`POST /teachers`, `GET /teachers`, `DELETE /teachers/{id}`
`POST /classrooms`, `GET /classrooms`
`POST /subjects`, `GET /subjects`
`POST /schedule/generate` → Schedule döner
`GET /schedule` → Son üretilen programı döner
`GET /health`
---
GÜN 2 — Frontend + Polish + Deploy
Adım 5: Frontend Sayfaları (3-4 saat)
[ ] `/` — Dashboard (özet: kaç öğretmen, kaç sınıf, son program durumu)
[ ] `/teachers` — Liste + ekle/sil + müsaitlik matrisi (5x8 checkbox grid)
[ ] `/classrooms` — Liste + ekle/sil
[ ] `/subjects` — Liste + ekle (öğretmen dropdown, haftalık saat)
[ ] `/schedule` — "Program Oluştur" butonu + haftalık grid görünüm
Her sınıf için ayrı tab/seçici
Her öğretmen için ayrı görünüm
Çakışma uyarısı
Adım 6: UX İyileştirmeleri (1.5 saat)
[ ] Loading state'leri
[ ] Error handling (infeasible schedule → anlaşılır mesaj)
[ ] Toast bildirimleri
[ ] Seed data butonu ("Örnek veriyle dene")
[ ] Renk kodlaması (ders bazlı)
Adım 7: Dokümantasyon (1 saat) ⭐ Case'in kritik kısmı
[ ] README: kurulum, çalıştırma, proje yapısı
[ ] `APPROACH.md` veya README içinde:
Problemi nasıl tanımladım
Hangi varsayımları yaptım
Hangi kısıtları dahil ettim / etmedim
Alternatif yaklaşımlar (OR-Tools, genetik, basit greedy) ve neden seçmediğim
Neden Greedy + Backtracking
AI araçlarını nasıl kullandım, kararları ben nasıl verdim
Adım 8: Deploy (1 saat)
[ ] Frontend → Vercel
[ ] Backend için karar anı (aşağıda)
[ ] Environment variables
[ ] CORS ayarları
[ ] Canlı test
---
⚠️ Karar Vermen Gereken Noktalar (ilerledikçe soracağım)
Persistence: JSON dosyası mı, SQLite mi, sadece in-memory mi? → Auth yok, ama refresh'te veri kaybolsun mu?
Backend deploy: Vercel Python Functions (tek platform ama kısıtlı) vs Railway (ayrı platform, daha stabil). Vercel'i zorlamak değerlendiricilerde "tek stack" izlenimi verir ama riskli.
Zaman dilimi sayısı: Haftada 5 gün × kaç ders saati? (Varsayılan: 8)
Ekstra kısıt: Öğle arası boş slot, aynı dersin arka arkaya 2 saat olabilmesi, öğretmen günlük max saat?
---
🧪 Varsayımlar (Şimdilik — değişebilir)
Hafta 5 iş günü, her gün 8 ders saati (40 slot)
Bir dersin haftalık saati = o kadar ayrı slot'a yayılır (blok ders yok)
Her ders tek öğretmene bağlı
Derslik/oda kısıtı yok (sınıfın kendi odası var varsayımı)
Öğretmen müsaitliği = gün+saat matrisi
Authentication yok (case'de belirtilmiş)
---
🚫 Kapsam Dışı (Mülakatta Savunacağım)
Authentication
Çoklu kullanıcı / rol
Oda/laboratuvar tahsisi
Öğretmen tercihleri (hard constraint vs soft constraint ayrımı)
Yedek öğretmen ataması
Takvim export (.ics)
---
🤖 AI Kullanımı Notu
Planlama, algoritma kararları, mimari seçimler → benim.
Claude'a sorduklarım: boilerplate, syntax, best practice checks, debugging.
README'de açıkça belirteceğim.
---
✅ Başarı Kriterleri
[ ] En az 3 sınıf, 5 öğretmen, 10 ders içeren seed data ile çalışıyor
[ ] Infeasible durumda anlamlı hata veriyor
[ ] UI'da çakışma görsel olarak yok
[ ] README self-explanatory
[ ] Canlı link çalışıyor
[ ] Problem yaklaşımı dokümante edilmiş
---
📌 Sonraki Adım
Adım 1'e geçelim mi? Proje iskeletini kuralım. Öncesinde karar vermen gereken 2 şey var:
Persistence: hangisi? (JSON / SQLite / in-memory)
Backend deploy stratejisi: Vercel Functions mi, Railway/Render mi?