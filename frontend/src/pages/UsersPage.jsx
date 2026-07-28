import React, { useState, useEffect } from 'react';
import api, { ROLES } from '../api';
import {
  Alert, Button, Card, DataTable, PageHeader, SelectField, TextInput,
} from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';
import { statusBadgeClass } from '../utils/format';

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
    e?.preventDefault?.();
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

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: 4,
    onSubmitLast: handleSubmit,
  });

  useEffect(() => {
    if (showForm) setTimeout(focusFirst, 50);
  }, [showForm, focusFirst]);

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

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const columns = [
    { key: 'name', header: 'نام', render: (u) => <span className="font-bold">{u.name}</span> },
    { key: 'username', header: 'نام کاربری', render: (u) => <span className="font-mono text-xs" dir="ltr">{u.username}</span> },
    { key: 'role', header: 'نقش', render: (u) => u.roleLabel || ROLES[u.role]?.label },
    {
      key: 'status',
      header: 'وضعیت',
      render: (u) => (
        <span className={statusBadgeClass(u.is_blocked ? 'مسدود' : 'تکمیل')}>
          {u.is_blocked ? 'مسدود' : 'فعال'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (u) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => openEdit(u)}>ویرایش</Button>
          <Button variant="secondary" onClick={() => toggleBlock(u)}>
            {u.is_blocked ? 'رفع مسدودیت' : 'مسدود'}
          </Button>
          <Button variant="danger" onClick={() => handleDelete(u)}>حذف</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت کاربران سیستم"
        description="ایجاد حسابدار، مشاهده‌گر و مدیر — مسدودسازی و حذف · Enter بین فیلدها"
        actions={<Button onClick={openCreate}>کاربر جدید</Button>}
      />

      {message && <Alert variant="success">{message}</Alert>}

      {showForm && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="font-bold">{editingId ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="نام نمایشی" required inputRef={setRef(0)} onKeyDown={(e) => handleKeyDown(e, 0)}
              value={formData.name} onChange={set('name')} />
            <TextInput label="نام کاربری (ورود)" required inputRef={setRef(1)} onKeyDown={(e) => handleKeyDown(e, 1)}
              value={formData.username} onChange={set('username')} dir="ltr" className="font-mono" />
            <TextInput
              label={editingId ? 'رمز عبور (خالی = بدون تغییر)' : 'رمز عبور'}
              type="password"
              required={!editingId}
              minLength={6}
              inputRef={setRef(2)}
              onKeyDown={(e) => handleKeyDown(e, 2)}
              value={formData.password}
              onChange={set('password')}
              dir="ltr"
            />
            <SelectField label="نقش" inputRef={setRef(3)} onKeyDown={(e) => handleKeyDown(e, 3)}
              value={formData.role} onChange={set('role')}>
              {Object.values(ROLES).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </SelectField>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '...' : 'ذخیره'}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>انصراف</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={users} emptyText="کاربری یافت نشد" />
    </div>
  );
}

export default UsersPage;
