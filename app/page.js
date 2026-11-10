'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const emptyForm = { sku: '', name: '', price: '', stock: '', unit: '' };

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  // สถานะการแก้ไขแบบ inline: เก็บ id ของแถวที่กำลังแก้ และข้อมูลที่แก้
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // ดึงสินค้าทั้งหมดจาก Supabase
  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

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

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // เพิ่มสินค้าใหม่
  async function handleAdd(e) {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      {
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        stock: parseInt(form.stock, 10),
        unit: form.unit.trim(),
      },
    ]);

    if (error) {
      showMessage('error', 'เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
      return;
    }
    setForm(emptyForm);
    showMessage('success', 'เพิ่มสินค้าเรียบร้อย');
    fetchProducts();
  }

  // เริ่มแก้ไขแถว
  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({
      sku: p.sku ?? '',
      name: p.name ?? '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? ''),
      unit: p.unit ?? '',
    });
  }

  // บันทึกการแก้ไข
  async function handleSave(id) {
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        price: Number(editForm.price),
        stock: parseInt(editForm.stock, 10),
        unit: editForm.unit.trim(),
      })
      .eq('id', id);

    if (error) {
      showMessage('error', 'แก้ไขไม่สำเร็จ: ' + error.message);
      return;
    }
    setEditingId(null);
    showMessage('success', 'แก้ไขสินค้าเรียบร้อย');
    fetchProducts();
  }

  // ลบสินค้า
  async function handleDelete(p) {
    if (!window.confirm(`ลบสินค้า "${p.name}" ใช่หรือไม่?`)) return;

    const { error } = await supabase.from('products').delete().eq('id', p.id);

    if (error) {
      showMessage('error', 'ลบไม่สำเร็จ: ' + error.message);
      return;
    }
    showMessage('success', 'ลบสินค้าเรียบร้อย');
    fetchProducts();
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <form className="card" onSubmit={handleAdd}>
        <h2>เพิ่มสินค้าใหม่</h2>
        <div style={styles.grid}>
          <div>
            <label>SKU</label>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label>ชื่อสินค้า</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label>ราคา</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label>คงเหลือ</label>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
          <div>
            <label>หน่วย</label>
            <input
              required
              placeholder="เช่น ชิ้น, แพ็ค"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" style={{ marginTop: 12 }}>
          เพิ่มสินค้า
        </button>
      </form>

      {/* ตารางสินค้า */}
      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : products.length === 0 ? (
        <p className="muted">ยังไม่มีสินค้า เพิ่มสินค้าชิ้นแรกได้ที่ฟอร์มด้านบน</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>ชื่อสินค้า</th>
                <th>ราคา</th>
                <th>คงเหลือ</th>
                <th>หน่วย</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) =>
                editingId === p.id ? (
                  // แถวโหมดแก้ไข
                  <tr key={p.id}>
                    <td>
                      <input
                        value={editForm.sku}
                        onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={editForm.unit}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      />
                    </td>
                    <td style={styles.actions}>
                      <button onClick={() => handleSave(p.id)}>บันทึก</button>
                      <button
                        style={styles.gray}
                        onClick={() => setEditingId(null)}
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                ) : (
                  // แถวปกติ
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{Number(p.price).toLocaleString('th-TH')}</td>
                    <td style={p.stock <= 5 ? { color: '#dc2626', fontWeight: 600 } : {}}>
                      {p.stock}
                    </td>
                    <td>{p.unit}</td>
                    <td style={styles.actions}>
                      <button onClick={() => startEdit(p)}>แก้ไข</button>
                      <button className="danger" onClick={() => handleDelete(p)}>
                        ลบ
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
  },
  actions: {
    display: 'flex',
    gap: 6,
    whiteSpace: 'nowrap',
  },
  gray: {
    background: '#6b7280',
  },
};
