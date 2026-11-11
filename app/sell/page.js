'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// [ใหม่] ส่งข้อมูลไปให้ API route ยิง Telegram ถ้าพังจะไม่กระทบการขาย
async function notifyTelegram(payload) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Telegram notify failed:', err);
  }
}

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setMessage({ type: 'error', text: 'โหลดสินค้าไม่สำเร็จ: ' + error.message });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const selected = products.find((p) => p.id === productId);
  const qty = parseInt(quantity, 10);
  const total = selected && qty > 0 ? Number(selected.price) * qty : 0;

  async function handleSell(e) {
    e.preventDefault();
    setMessage(null);

    if (!selected) {
      setMessage({ type: 'error', text: 'กรุณาเลือกสินค้า' });
      return;
    }
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: 'กรุณากรอกจำนวนที่ถูกต้อง' });
      return;
    }

    setSubmitting(true);

    const { data: fresh, error: freshError } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('id', selected.id)
      .single();

    if (freshError || !fresh) {
      setMessage({ type: 'error', text: 'ตรวจสอบสต็อกไม่สำเร็จ กรุณาลองใหม่' });
      setSubmitting(false);
      return;
    }

    if (fresh.stock < qty) {
      setMessage({
        type: 'error',
        text: `สต็อกไม่พอ "${fresh.name}" เหลือ ${fresh.stock} เท่านั้น`,
      });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({ stock: fresh.stock - qty })
      .eq('id', fresh.id)
      .eq('stock', fresh.stock)
      .select();

    if (updateError || !updated || updated.length === 0) {
      setMessage({
        type: 'error',
        text: 'สต็อกเพิ่งมีการเปลี่ยนแปลง กรุณากดขายอีกครั้ง',
      });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    const { error: insertError } = await supabase.from('sales').insert([
      {
        product_id: fresh.id,
        product_name: fresh.name,
        quantity: qty,
        total_price: Number(fresh.price) * qty,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      await supabase.from('products').update({ stock: fresh.stock }).eq('id', fresh.id);
      setMessage({ type: 'error', text: 'บันทึกการขายไม่สำเร็จ: ' + insertError.message });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    // [ใหม่] ขายสำเร็จแล้ว ส่งแจ้งเตือน Telegram (ไม่ await เพื่อไม่ให้หน้าเว็บช้า)
    notifyTelegram({
      productName: fresh.name,
      quantity: qty,
      totalPrice: Number(fresh.price) * qty,
      stockAfter: fresh.stock - qty,
    });

    setMessage({
      type: 'success',
      text: `ขายสำเร็จ: ${fresh.name} x ${qty} รวม ${(Number(fresh.price) * qty).toLocaleString('th-TH')} บาท`,
    });
    setProductId('');
    setQuantity('');
    setSubmitting(false);
    fetchProducts();
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : (
        <form className="card" onSubmit={handleSell} style={{ maxWidth: 480 }}>
          <div className="form-row">
            <label>เลือกสินค้า</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">-- เลือกสินค้า --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.name} - {Number(p.price).toLocaleString('th-TH')} บาท
                  {p.stock <= 0 ? ' (หมด)' : ''}
                </option>
              ))}
            </select>
            {selected && (
              <p className="muted" style={{ marginTop: 4 }}>
                คงเหลือ {selected.stock} {selected.unit}
              </p>
            )}
          </div>

          <div className="form-row">
            <label>จำนวนที่ขาย</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div style={styles.total}>
            ยอดรวม: <strong>{total.toLocaleString('th-TH')}</strong> บาท
          </div>

          <button type="submit" disabled={submitting || !selected || !(qty > 0)}>
            {submitting ? 'กำลังบันทึก...' : 'ขาย'}
          </button>
        </form>
      )}
    </div>
  );
}

const styles = {
  total: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '12px 14px',
    marginBottom: 14,
    fontSize: '1.2rem',
  },
};
