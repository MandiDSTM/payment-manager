import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from './ui';

const COMPARE_FIELDS = [
  { key: 'personnel_code', label: 'کد پرسنلی' },
  { key: 'first_name', label: 'نام' },
  { key: 'last_name', label: 'نام خانوادگی' },
  { key: 'father_name', label: 'نام پدر' },
  { key: 'national_id', label: 'کد ملی' },
  { key: 'sheba', label: 'شماره شبا' },
  { key: 'account_holder_name', label: 'نام صاحب حساب' },
  { key: 'mobile', label: 'موبایل' },
  { key: 'city', label: 'شهر' },
  { key: 'description', label: 'توضیحات' },
];

const display = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  return String(value);
};

const fieldFilled = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const pickPair = (members) => ({
  firstId: members[0]?.id ?? null,
  secondId: members[1]?.id ?? null,
});

const findConflicts = (first, second) => {
  if (!first || !second) return [];
  return COMPARE_FIELDS.reduce((list, field) => {
    const a = first[field.key];
    const b = second[field.key];
    if (fieldFilled(a) && fieldFilled(b) && String(a).trim() !== String(b).trim()) {
      list.push({
        field: field.key,
        label: field.label,
        first: a,
        second: b,
      });
    }
    return list;
  }, []);
};

export default function PersonnelDuplicatesModal({
  open,
  groups,
  merging,
  onClose,
  onMergePair,
}) {
  const [queue, setQueue] = useState([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [firstId, setFirstId] = useState(null);
  const [secondId, setSecondId] = useState(null);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [successNote, setSuccessNote] = useState('');
  const [done, setDone] = useState(false);
  const [resolveQueue, setResolveQueue] = useState([]);
  const [resolveIndex, setResolveIndex] = useState(0);
  const [fieldChoices, setFieldChoices] = useState({});

  const resetResolve = () => {
    setResolveQueue([]);
    setResolveIndex(0);
    setFieldChoices({});
  };

  useEffect(() => {
    if (!open) return;
    const next = (groups || [])
      .map((group) => ({
        key: group.key,
        label: group.label,
        matchType: group.matchType,
        members: [...(group.members || [])],
      }))
      .filter((g) => g.members.length >= 2);
    setQueue(next);
    setGroupIndex(0);
    setError(null);
    setConflicts([]);
    setSuccessNote('');
    setDone(next.length === 0);
    resetResolve();
    const pair = pickPair(next[0]?.members || []);
    setFirstId(pair.firstId);
    setSecondId(pair.secondId);
  }, [groups, open]);

  const group = queue[groupIndex] || null;
  const members = group?.members || [];
  const first = useMemo(() => members.find((m) => m.id === firstId) || null, [members, firstId]);
  const second = useMemo(() => members.find((m) => m.id === secondId) || null, [members, secondId]);
  const resolving = resolveQueue.length > 0;
  const currentConflict = resolving ? resolveQueue[resolveIndex] : null;

  if (!open) return null;

  const showGroup = (nextQueue, idx) => {
    let nextIndex = idx;
    while (nextIndex < nextQueue.length && nextQueue[nextIndex].members.length < 2) {
      nextIndex += 1;
    }
    setQueue(nextQueue);
    resetResolve();
    if (nextIndex >= nextQueue.length) {
      setDone(true);
      setFirstId(null);
      setSecondId(null);
      return;
    }
    setDone(false);
    setGroupIndex(nextIndex);
    const pair = pickPair(nextQueue[nextIndex].members);
    setFirstId(pair.firstId);
    setSecondId(pair.secondId);
  };

  const applyDeleted = (deletedId, kept) => {
    resetResolve();
    const nextQueue = queue.map((g, i) => {
      if (i !== groupIndex) return g;
      const nextMembers = g.members
        .filter((m) => m.id !== deletedId)
        .map((m) => (kept && m.id === kept.id ? { ...m, ...kept } : m));
      return { ...g, members: nextMembers };
    });
    const current = nextQueue[groupIndex];
    if (current && current.members.length >= 2) {
      setQueue(nextQueue);
      const pair = pickPair(current.members);
      setFirstId(pair.firstId);
      setSecondId(pair.secondId);
      return;
    }
    showGroup(nextQueue, groupIndex + 1);
  };

  const runMerge = async (mode, choices) => {
    if (!firstId || !secondId || firstId === secondId) {
      setError('رکورد اول و دوم باید دو نفر متفاوت باشند');
      setConflicts([]);
      return;
    }
    setError(null);
    setConflicts([]);
    setSuccessNote('');
    const result = await onMergePair({ firstId, secondId, mode, fieldChoices: choices });
    if (!result?.ok) {
      const nextConflicts = result?.conflicts || [];
      setError(result?.message || 'خطا در ادغام');
      setConflicts(nextConflicts);
      if (mode === 'union' && nextConflicts.length > 0) {
        setResolveQueue(nextConflicts);
        setResolveIndex(0);
        setFieldChoices(choices || {});
      }
      return;
    }
    setSuccessNote(result.data?.message || 'ادغام انجام شد');
    applyDeleted(result.data.deletedId, result.data.kept);
  };

  const startUnion = () => {
    const nextConflicts = findConflicts(first, second);
    if (nextConflicts.length === 0) {
      runMerge('union', {});
      return;
    }
    setError(null);
    setConflicts([]);
    setSuccessNote('');
    setResolveQueue(nextConflicts);
    setResolveIndex(0);
    setFieldChoices({});
  };

  const chooseConflictValue = (side) => {
    if (!currentConflict) return;
    const nextChoices = { ...fieldChoices, [currentConflict.field]: side };
    if (resolveIndex + 1 < resolveQueue.length) {
      setFieldChoices(nextChoices);
      setResolveIndex(resolveIndex + 1);
      return;
    }
    runMerge('union', nextChoices);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={() => !merging && onClose()}
    >
      <div
        className="ui-card w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b space-y-1" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold">ادغام موارد مشابه پرسنل</h3>
          <p className="text-sm ui-muted">
            هر بار دو رکورد ادغام می‌شوند. اگر چند مورد شبیه هم باشند، بعد از هر ادغام جفت بعدی همان گروه می‌آید.
          </p>
          {!done && group && (
            <p className="text-sm font-bold">
              گروه {groupIndex + 1} از {queue.length}
              {' — '}
              {group.label}
              <span className="text-xs ui-muted font-normal mr-2">
                {group.matchType === 'sheba' ? 'تطابق شبا' : 'تطابق نام'}
                {' · '}
                {members.length} رکورد
              </span>
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {error && (
            <Alert variant="error">
              <div className="font-bold">{error}</div>
              {conflicts.length > 0 && !resolving && (
                <ul className="mt-2 text-sm list-disc pr-5 space-y-1">
                  {conflicts.map((c) => (
                    <li key={c.field}>
                      {c.label}: «{display(c.first)}» در برابر «{display(c.second)}»
                    </li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
          {successNote && !error && <Alert variant="success">{successNote}</Alert>}

          {done || !group ? (
            <div className="ui-empty">گروه مشابه دیگری برای ادغام نمانده است</div>
          ) : resolving && currentConflict ? (
            <div className="space-y-4">
              <Alert variant="info">
                فیلد {resolveIndex + 1} از {resolveQueue.length}: مقدار اصلی «{currentConflict.label}» را انتخاب کنید.
              </Alert>
              <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
                <div className="font-bold text-lg">{currentConflict.label}</div>
                <p className="text-sm ui-muted">هر دو رکورد مقدار دارند و با هم فرق دارند.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-xl border p-4 text-right space-y-2"
                  style={{ borderColor: 'var(--border)' }}
                  disabled={merging}
                  onClick={() => chooseConflictValue('first')}
                >
                  <div className="text-xs ui-muted">رکورد اول {first ? `(${first.personnel_code})` : ''}</div>
                  <div className="font-bold break-all">{display(currentConflict.first)}</div>
                </button>
                <button
                  type="button"
                  className="rounded-xl border p-4 text-right space-y-2"
                  style={{ borderColor: 'var(--border)' }}
                  disabled={merging}
                  onClick={() => chooseConflictValue('second')}
                >
                  <div className="text-xs ui-muted">رکورد دوم {second ? `(${second.personnel_code})` : ''}</div>
                  <div className="font-bold break-all">{display(currentConflict.second)}</div>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm space-y-1">
                  <span className="font-bold">رکورد اول</span>
                  <select
                    className="ui-input w-full"
                    value={firstId || ''}
                    disabled={merging}
                    onChange={(e) => {
                      resetResolve();
                      setFirstId(Number(e.target.value));
                    }}
                  >
                    {members.map((m) => (
                      <option key={`a-${m.id}`} value={m.id}>
                        {m.personnel_code} — {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm space-y-1">
                  <span className="font-bold">رکورد دوم</span>
                  <select
                    className="ui-input w-full"
                    value={secondId || ''}
                    disabled={merging}
                    onChange={(e) => {
                      resetResolve();
                      setSecondId(Number(e.target.value));
                    }}
                  >
                    {members.map((m) => (
                      <option key={`b-${m.id}`} value={m.id}>
                        {m.personnel_code} — {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>فیلد</th>
                      <th>رکورد اول {first ? `(${first.personnel_code})` : ''}</th>
                      <th>رکورد دوم {second ? `(${second.personnel_code})` : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_FIELDS.map((field) => {
                      const a = first?.[field.key];
                      const b = second?.[field.key];
                      const both = fieldFilled(a) && fieldFilled(b) && String(a).trim() !== String(b).trim();
                      return (
                        <tr key={field.key} style={both ? { background: 'var(--danger-soft, #fee2e2)' } : undefined}>
                          <td className="font-bold">{field.label}</td>
                          <td className={['personnel_code', 'sheba', 'national_id'].includes(field.key) ? 'font-mono text-xs' : ''}>
                            {display(a)}
                          </td>
                          <td className={['personnel_code', 'sheba', 'national_id'].includes(field.key) ? 'font-mono text-xs' : ''}>
                            {display(b)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs ui-muted">
                تجمیع جاهای خالی را از رکورد دیگر پر می‌کند. اگر هر دو مقدار متفاوت داشته باشند — از جمله کد پرسنلی — یکی‌یکی انتخاب می‌کنید کدام مقدار اصلی باشد.
                ردیف باقی‌مانده همان رکورد اول است؛ اگر کد پرسنلی دوم را انتخاب کنید، بعد از حذف رکورد دوم همان کد روی رکورد اول نوشته می‌شود.
                انتخاب کل رکورد اول یا دوم، همان رکورد را کامل نگه می‌دارد و دیگری را حذف می‌کند.
              </p>
            </>
          )}
        </div>

        <div className="p-5 border-t flex flex-wrap gap-2 justify-end" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={onClose} disabled={merging}>بستن</Button>
          {!done && group && resolving && (
            <Button
              variant="secondary"
              onClick={() => {
                resetResolve();
                setError(null);
                setConflicts([]);
              }}
              disabled={merging}
            >
              بازگشت
            </Button>
          )}
          {!done && group && !resolving && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setConflicts([]);
                  setSuccessNote('');
                  showGroup(queue, groupIndex + 1);
                }}
                disabled={merging}
              >
                رد کردن این گروه
              </Button>
              <Button variant="secondary" onClick={() => runMerge('keep_first')} disabled={merging || !first || !second}>
                {merging ? '...' : 'انتخاب رکورد اول'}
              </Button>
              <Button variant="secondary" onClick={() => runMerge('keep_second')} disabled={merging || !first || !second}>
                {merging ? '...' : 'انتخاب رکورد دوم'}
              </Button>
              <Button onClick={startUnion} disabled={merging || !first || !second}>
                {merging ? 'در حال ادغام...' : 'تجمیع دو رکورد'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
