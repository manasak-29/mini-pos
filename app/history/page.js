'use client';

import { useState, useEffect } from 'react';
// ไฟล์นี้อยู่ลึกกว่า app/page.js หนึ่งชั้น จึงต้องใช้ ../../
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ดึงประวัติการขายทั้งหมด เรียงจากล่าสุดไปเก่าสุด
  async function fetchSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setError('โหลดประวัติการขายไม่สำเร็จ: ' + error.message);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSales();
  }, []);

  // ยอดขายรวมทั้งหมด (sum ของ total_price)
  const grandTotal = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

  // แปลงวันเวลาเป็นรูปแบบไทย
  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {error && <div className="message error">{error}</div>}

      {/* สรุปยอดขายรวม */}
      <div className="card" style={styles.summary}>
        <div>
          <div className="muted">ยอดขายรวมทั้งหมด</div>
          <div style={styles.bigNumber}>{grandTotal.toLocaleString('th-TH')} บาท</div>
        </div>
        <div>
          <div className="muted">จำนวนรายการ</div>
          <div style={styles.bigNumber}>{sales.length.toLocaleString('th-TH')}</div>
        </div>
      </div>

      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : sales.length === 0 ? (
        <p className="muted">ยังไม่มีรายการขาย</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>วันเวลาที่ขาย</th>
                <th>ชื่อสินค้า</th>
                <th>จำนวน</th>
                <th>ยอดรวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.sold_at)}</td>
                  <td>{s.product_name}</td>
                  <td>{s.quantity}</td>
                  <td>{Number(s.total_price).toLocaleString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  summary: {
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap',
  },
  bigNumber: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#2563eb',
  },
};
