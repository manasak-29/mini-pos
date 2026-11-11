import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LOW_STOCK_THRESHOLD = 5;

// กันอักขระพิเศษใน HTML mode ของ Telegram
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ส่งข้อความเข้า Telegram
async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) {
    throw new Error('Telegram error ' + res.status);
  }
}

export async function POST(request) {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json({ ok: false, error: 'missing telegram config' });
    }

    const { productName, quantity, totalPrice, stockAfter } = await request.json();

    // ตรวจชนิดข้อมูลเบื้องต้น
    if (
      typeof productName !== 'string' ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(totalPrice) ||
      !Number.isFinite(stockAfter)
    ) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    const name = escapeHtml(productName.slice(0, 200));
    const time = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    // งานที่ 1: แจ้งเตือน Order ใหม่
    const orderText =
      `🛍️ <b>มีรายการขายใหม่!</b>\n` +
      `- สินค้า: ${name}\n` +
      `- จำนวน: ${quantity} ชิ้น\n` +
      `- ราคารวม: ${Number(totalPrice).toLocaleString('th-TH')} บาท\n` +
      `- สต๊อกคงเหลือปัจจุบัน: ${stockAfter} ชิ้น\n` +
      `- เวลา: ${time}`;
    await sendTelegram(orderText);

    // งานที่ 2: แจ้งเตือนสต๊อกใกล้หมด (<= 5)
    if (stockAfter <= LOW_STOCK_THRESHOLD) {
      const lowText =
        `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
        `- สินค้า: ${name}\n` +
        `- คงเหลือเพียง: ${stockAfter} ชิ้น\n` +
        `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;
      await sendTelegram(lowText);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // ไม่ throw เพื่อไม่ให้กระทบหน้าขาย
    return NextResponse.json({ ok: false, error: String(err.message || err) });
  }
}
