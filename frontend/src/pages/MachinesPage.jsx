import React, { useState, useEffect } from 'react';
import api, { isAdmin } from '../api';
import { Button, Card, DataTable, PageHeader, TextInput } from '../components/ui';
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav';

function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchMachines(); }, []);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return alert('نام ماشین اجباری است');
    setLoading(true);
    try {
      if (editingId) {
        const res = await api.put(`/machines/${editingId}`, { name });
        alert(res.data.message);
      } else {
        const res = await api.post('/machines', { name });
        alert(res.data.message);
      }
      resetForm();
      fetchMachines();
      focusFirst();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const { setRef, handleKeyDown, focusFirst } = useFormKeyboardNav({
    fieldCount: 1,
    onSubmitLast: handleSubmit,
  });

  const handleEdit = (machine) => {
    setEditingId(machine.id);
    setName(machine.name);
    setTimeout(focusFirst, 50);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این ماشین اطمینان دارید؟')) return;
    try {
      const res = await api.delete(`/machines/${id}`);
      alert(res.data.message);
      fetchMachines();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const columns = [
    { key: 'index', header: '#', render: (_m, i) => <span className="ui-muted">{i + 1}</span> },
    { key: 'name', header: 'نام ماشین', render: (m) => <span className="font-medium">{m.name}</span> },
  ];

  if (isAdmin()) {
    columns.push({
      key: 'actions',
      header: 'عملیات',
      render: (m) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => handleEdit(m)}>ویرایش</Button>
          <Button variant="danger" onClick={() => handleDelete(m.id)}>حذف</Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ماشین‌ها" description="ثبت و مدیریت لیست ماشین‌ها" />

      {isAdmin() && (
        <Card className="p-5 md:p-6">
          <h2 className="text-lg font-bold mb-4">
            {editingId ? 'ویرایش ماشین' : 'ثبت ماشین جدید'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <TextInput
              label="نام ماشین"
              className="flex-1 w-full"
              inputRef={setRef(0)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام ماشین"
            />
            <Button type="submit" disabled={loading}>
              {loading ? '...' : editingId ? 'بروزرسانی' : 'ثبت'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>انصراف</Button>
            )}
          </form>
        </Card>
      )}

      <DataTable columns={columns} rows={machines} emptyText="ماشینی ثبت نشده است" />
      <p className="text-xs ui-muted px-1">{machines.length} ماشین</p>
    </div>
  );
}

export default MachinesPage;
