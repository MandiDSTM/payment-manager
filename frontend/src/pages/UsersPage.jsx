import React, { useState, useEffect } from 'react';
import api, { ROLES } from '../api';

const emptyForm = () => ({
  name: '',
  username: '',
  password: '',
  role: 'accountant',
});

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setShowForm(true);
    setMessage('');
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
    });
    setShowForm(true);
    setMessage('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = { ...formData };
      if (editingId && !payload.password) delete payload.password;

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
        setMessage('کاربر بروزرسانی شد');
      } else {
        await api.post('/users', payload);
        setMessage('کاربر جدید ایجاد شد');
      }
      closeForm();
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (user) => {
    if (!window.confirm(user.is_blocked ? 'مسدودیت برداشته شود؟' : 'این کاربر مسدود شود؟')) return;
    try {
      await api.patch(`/users/${user.id}/block`, { is_blocked: !user.is_blocked });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'خطا');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`کاربر «${user.name}» حذف شود؟`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'خطا');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت کاربران سیستم</h2>
          <p className="text-sm text-slate-500 mt-1">ایجاد حسابدار، مشاهده‌گر و مدیر — مسدودسازی و حذف</p>
        </div>
        <button type="button" onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm">
          + کاربر جدید
        </button>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">{message}</div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 mb-4">{editingId ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-600">نام نمایشی</label>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 border rounded-xl px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">نام کاربری (ورود)</label>
              <input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full mt-1 border rounded-xl px-3 py-2 font-mono" required dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">
                رمز عبور {editingId && <span className="text-slate-400 font-normal">(خالی = بدون تغییر)</span>}
              </label>
              <input type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full mt-1 border rounded-xl px-3 py-2" dir="ltr"
                required={!editingId} minLength={6} />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">نقش</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full mt-1 border rounded-xl px-3 py-2">
                {Object.values(ROLES).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50">
                {loading ? '...' : 'ذخیره'}
              </button>
              <button type="button" onClick={closeForm}
                className="bg-slate-100 text-slate-700 px-5 py-2 rounded-xl text-sm">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">نام کاربری</th>
              <th className="p-3 text-right">نقش</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-bold">{user.name}</td>
                <td className="p-3 font-mono text-xs" dir="ltr">{user.username}</td>
                <td className="p-3">{user.roleLabel || ROLES[user.role]?.label}</td>
                <td className="p-3">
                  {user.is_blocked ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold">مسدود</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">فعال</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(user)}
                      className="text-blue-600 hover:underline text-xs">ویرایش</button>
                    <button type="button" onClick={() => toggleBlock(user)}
                      className={`text-xs hover:underline ${user.is_blocked ? 'text-green-600' : 'text-amber-600'}`}>
                      {user.is_blocked ? 'رفع مسدودیت' : 'مسدود'}
                    </button>
                    <button type="button" onClick={() => handleDelete(user)}
                      className="text-red-600 hover:underline text-xs">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersPage;
