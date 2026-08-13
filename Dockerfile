# ---------- build ----------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim

WORKDIR /app

# Oracle Instant Client (Thick mode) ต้องใช้ glibc -> ห้ามเปลี่ยน base image เป็น alpine (musl)
# server เก่าเกินกว่า node-oracledb Thin mode จะต่อได้ (NJS-138) เลยต้องพึ่ง client library เต็มรูปแบบ
RUN apt-get update \
    && apt-get install -y --no-install-recommends libaio1 unzip \
    && rm -rf /var/lib/apt/lists/*

# ต้องวาง Instant Client "Linux x86-64" Basic package (.zip ที่ยังไม่แตก) ไว้ที่
# working-api/oracle-instantclient/ ก่อน build เอง (Oracle บังคับ login ด้วย account ถึงจะโหลดได้
# ไม่มี URL ให้ดึงอัตโนมัติใน Dockerfile) โหลดได้จาก
# https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
COPY oracle-instantclient/*.zip /tmp/instantclient.zip
RUN mkdir -p /opt/oracle/instantclient \
    && unzip -j /tmp/instantclient.zip -d /opt/oracle/instantclient \
    && rm /tmp/instantclient.zip

ENV ORACLE_CLIENT_LIB_DIR=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient

# container default เป็น UTC แต่ระบบทั้งหมด (mysql2 timezone:'local', cron ใน
# autoCloseWorkingAction.ts) ตั้งสมมติฐานว่าเป็นเวลาไทยเสมอ ไม่ตั้งค่านี้จะทำให้เวลาที่บันทึก/
# คำนวณ (เช่น wa_start_job) เพี้ยนไป 7 ชั่วโมงเทียบกับเวลาจริง
ENV TZ=Asia/Bangkok

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 5001

CMD ["node", "dist/server.js"]
