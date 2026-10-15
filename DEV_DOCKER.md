# เปิด Frontend และ Backend

วางสอง repo ข้างกัน เช่น `C:\SA\chaum-work-management-frontend` และ `C:\SA\chaum-work-management-backend` เครื่องอื่น clone ทั้งสอง repo ในรูปแบบเดียวกัน ใช้ Node.js 24 / Go 1.26 สำหรับรันแบบ native หรือ Docker Desktop แบบ Linux containers สำหรับ Compose

## 1. เตรียม config ครั้งแรก

Frontend คัดลอก `.env.example` เป็น `.env.local` ถ้ายังไม่มีไฟล์ แล้วกรอก public LIFF ID ของ Web และ Worker จาก LINE Developers พร้อม `BACKEND_URL=http://127.0.0.1:8080` ห้ามใส่ Supabase key หรือ LINE token ใน Frontend

Git Bash:

```bash
cp -n .env.example .env.local
```

PowerShell:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Backend ใช้ `.env` ของเครื่องนั้นตาม `.env.example` ต้องมี DATABASE_URL และ LINE channel/provider ที่ถูกต้อง รวม config Storage, QR และ Messaging ที่จะใช้งานจริง Docker ไม่สร้างฐานข้อมูล ตาราง หรือ bucket และไม่ใส่ `.env` ลง image

## 2. รันแบบพัฒนา

Terminal Backend:

```bash
cd /c/SA/chaum-work-management-backend
go run ./cmd/server
```

Terminal Frontend:

```bash
cd /c/SA/chaum-work-management-frontend
npm ci
npm run dev
```

เปิด http://127.0.0.1:5500 หรือ http://127.0.0.1:5500/preview ส่วน Backend health อยู่ http://127.0.0.1:8080/health หยุดด้วย Ctrl+C ในแต่ละ Terminal

## 3. รัน image ที่ build แล้วด้วย Docker Compose

ในโฟลเดอร์ Frontend:

```bash
npm run docker:build
npm run docker:up
npm run docker:ps
```

คำสั่ง Docker โดยตรงที่เทียบเท่า:

```bash
docker compose --env-file .env.local build
docker compose --env-file .env.local up --build -d
docker compose --env-file .env.local ps
docker compose --env-file .env.local logs -f
docker compose --env-file .env.local down
```

Compose เปิด Frontend ที่ 5500 และ Backend ที่ 8080 รอ health ของ Backend ก่อนเปิด Frontend ภายใน container proxy ใช้ `http://backend:8080` อัตโนมัติ จึงไม่ใช้ localhost ของ container เป็น Backend

หากต้องการเปิด Backend อย่างเดียว เข้า repo Backend แล้วใช้ `docker compose up --build -d` หยุดด้วย `docker compose down`

ห้ามรัน native และ Compose บนพอร์ตเดียวกันพร้อมกัน ถ้าจะทดสอบ Compose ขณะ native ยังเปิด ให้ใช้พอร์ตอื่น:

```bash
FRONTEND_PORT=5501 BACKEND_PORT=8081 docker compose --env-file .env.local up --build -d
```

สำหรับเปิดทั้ง stack บนพอร์ตอื่น ใช้ `FRONTEND_PORT=5501 BACKEND_PORT=8081 docker compose --env-file .env.local up --build -d` ใน Git Bash หรือกำหนด `$env:FRONTEND_PORT='5501'; $env:BACKEND_PORT='8081'` ก่อนคำสั่งใน PowerShell

## LINE, GPS และเครื่องอื่น

Docker ทำให้ runtime/build เหมือนกัน แต่แต่ละเครื่องยังต้องมี config ที่ใช้ได้ หากใช้ LIFF/GPS/กล้องบนมือถือ ให้เปิด HTTPS tunnel ไปพอร์ต Frontend และตั้ง endpoint/callback LINE ให้ตรง origin ของเครื่องนั้น เช่น `ngrok http 5500` ห้ามใช้ localhost ของคอมพิวเตอร์เป็น URL บนมือถือ

public LIFF IDs ถูกใส่ตอน build image หากเปลี่ยน ID ต้อง build ใหม่ `BACKEND_URL` เป็น runtime config; backend secrets โหลดตอนสร้าง container เปลี่ยน `.env` แล้วใช้ `up -d --force-recreate` แทน `restart` อย่างเดียว

Compose ใช้ Supabase ตาม Backend `.env` งาน background ของ Backend อาจประมวลผลข้อมูลตามปกติของระบบ ไม่มีการ reset/seed/migration ในคำสั่งนี้ การ build สำเร็จไม่ใช่หลักฐานว่า GPS/LINE/Storage end-to-end ผ่าน

อ้างอิง: [Docker Compose include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/) และคู่มือ Next.js `output: standalone` ที่มากับเวอร์ชันใน repo

## ผลตรวจ 2026-10-10

- Frontend lint, typecheck, 33 tests, format check และ production Docker build ผ่าน
- Docker ทั้งสอง service healthy; Backend /health และ Frontend /preview HTTP 200 บนพอร์ตทดสอบ 8081/5510
- Frontend proxy ส่งถึง Backend /api/web/me จริง; dummy token ถูกปฏิเสธ HTTP 401 พร้อม log ฝั่ง Backend
- Image ใช้ non-root user และไม่มีไฟล์ .env/.env.local ใน /app
- ปิด project chaum-docker-check หลังตรวจ; server native เดิมไม่ถูกปิด
