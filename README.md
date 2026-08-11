# FIDO2 Passwordless Authentication Demo

ระบบยืนยันตัวตนไร้รหัสผ่านด้วยมาตรฐาน FIDO2 / WebAuthn

## 🔐 Features

- **Registration**: กรอกข้อมูล Username, ชื่อ, นามสกุล, เบอร์โทร แล้วยืนยันด้วยไบโอเมตริก (ลายนิ้วมือ / Face ID / Windows Hello)
- **Authentication**: กรอกเพียง Username แล้วสแกนนิ้วมือเพื่อเข้าสู่ระบบ — ไม่ต้องจำรหัสผ่าน
- **Mock Backend**: ใช้ `localStorage` เก็บ Credential (Demo Mode)

## 🛠️ Tech Stack

| เทคโนโลยี | รายละเอียด |
|-----------|------------|
| HTML5 | โครงสร้างหน้าเว็บ |
| CSS3 | Dark theme, glassmorphism, animations |
| JavaScript (Vanilla) | WebAuthn API, localStorage |
| WebAuthn / FIDO2 | มาตรฐานการยืนยันตัวตนไร้รหัสผ่าน |
| Vercel | Deployment (HTTPS) |

## 🚀 Quick Start (Local)

ต้องรันบน `localhost` หรือ `https://` เนื่องจากข้อจำกัดของ WebAuthn API

```bash
# ใช้ Python simple HTTP server
python -m http.server 8080
# แล้วเปิด http://localhost:8080

# หรือใช้ Node.js
npx serve .
# แล้วเปิด http://localhost:3000
```

## 📦 Deploy to Vercel

```bash
# ติดตั้ง Vercel CLI
npm install -g vercel

# Deploy
vercel

# หรือเชื่อมต่อ GitHub repo กับ Vercel Dashboard แล้ว auto-deploy
```

## 📖 WebAuthn Flow

### Registration
```
1. ผู้ใช้กรอกข้อมูล (Username, ชื่อ, นามสกุล, เบอร์)
2. JavaScript เรียก navigator.credentials.create()
3. Browser แสดง Pop-up ให้สแกนนิ้วมือ / Face ID / PIN
4. ได้รับ Credential ID → บันทึกลง localStorage
```

### Authentication
```
1. ผู้ใช้กรอก Username
2. JavaScript เรียก navigator.credentials.get() พร้อม allowCredentials
3. Browser แสดง Pop-up ให้ยืนยัน biometric
4. ตรวจสอบ Credential ID → เข้าสู่ระบบสำเร็จ
```

## ⚠️ หมายเหตุ

- ระบบนี้เป็น **Demo** ไม่มี backend server จริง
- Credential ถูกเก็บใน `localStorage` ของเบราว์เซอร์
- ในระบบ Production จริงต้องมี server ยืนยัน signature ด้วย crypto library
- WebAuthn ต้องทำงานบน `https://` หรือ `localhost` เท่านั้น

## 🎓 Assignment Info

- **Course**: มาตรฐานการยืนยันตัวตนแบบไร้รหัสผ่าน (Passwordless Authentication)
- **Standard**: FIDO2 / WebAuthn (W3C)
- **AI Tool Used**: Google AI Studio (Gemini)
