import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';

const STATUS_LABELS = {
  'فرم خام': 'bg-slate-100 text-slate-700',
  'در انتظار پرداخت': 'bg-amber-100 text-amber-800',
  'باطل‌شده': 'bg-red-100 text-red-700',
  'پرداخت شده': 'bg-green-100 text-green-800',
};

function PermissionSerialsPage() {
  const [serials, setSerials] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ serial_number: '', recipient_user_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (usageFilter) params.usage_location = usageFilter;
    const [s, u] = await Promise.all([
      api.get('/permission-serials', { params }),
      api.get('/users'),
    ]);
    setSerials(s.data.data || []);
    setUsers(u.data.data || []);
  };

  useEffect(() => { fetchData(); }, [statusFilter, usageFilter]);

  const filtered = serials.filter((s) =>
    [s.serial_number, s.recipient_name, s.usage_location, s.status]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/permission-serials', form);
      setShowForm(false);
      setForm({ serial_number: '', recipient_user_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('آیا از باطل‌کردن این مجوز اطمینان دارید؟')) return;
    try {
      await api.patch(`/permission-serials/${id}/void`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleAwaiting = async (id) => {
    try {
      await api.patch(`/permission-serials/${id}/awaiting`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">سریال مجوز پرداخت</h2>
          {isAdmin() && (
            <button type="button" onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
              + مجوز جدید
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="border rounded-xl px-3 py-2 text-sm" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            {Object.keys(STATUS_LABELS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="border rounded-xl px-3 py-2 text-sm" value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}>
            <option value="">همه محل مصرف</option>
            <option value="تجاری">تجاری</option>
            <option value="پرسنل">پرسنل</option>
            <option value="ماشین‌آلات">ماشین‌آلات</option>
          </select>
          <input type="text" placeholder="جستجو..." className="flex-1 border rounded-xl px-4 py-2 text-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {showForm && isAdmin() && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">شماره سریال *
              <input required className="w-full mt-1 border rounded-xl px-3 py-2"
                value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            </label>
            <label className="text-sm">تحویل‌گیرنده *
              <select required className="w-full mt-1 border rounded-xl px-3 py-2"
                value={form.recipient_user_id} onChange={(e) => setForm({ ...form, recipient_user_id: e.target.value })}>
                <option value="">انتخاب کاربر</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">ذخیره</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-slate-200 px-6 py-2 rounded-xl">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-right">شناسه</th>
              <th className="p-3 text-right">شماره سریال</th>
              <th className="p-3 text-right">تحویل‌گیرنده</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">محل مصرف</th>
              {isAdmin() && <th className="p-3 text-right">عملیات</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{s.id}</td>
                <td className="p-3 font-mono font-bold">{s.serial_number}</td>
                <td className="p-3">{s.recipient_name || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_LABELS[s.status] || ''}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3">{s.usage_location || '—'}</td>
                {isAdmin() && (
                  <td className="p-3 whitespace-nowrap">
                    {s.status === 'فرم خام' && (
                      <button type="button" className="text-amber-600 ml-2" onClick={() => handleAwaiting(s.id)}>
                        در انتظار پرداخت
                      </button>
                    )}
                    {(s.status === 'فرم خام' || s.status === 'در انتظار پرداخت') && (
                      <button type="button" className="text-red-600" onClick={() => handleVoid(s.id)}>
                        باطل
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PermissionSerialsPage;
