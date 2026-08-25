import React, { useEffect, useMemo, useState } from 'react';
import api, { isSelectablePermit } from '../api';
import { executorLabel } from '../utils/lookups';
import { Alert, Button, SelectField } from './ui';

const MONTHLY_WORK = 'کارکرد ماهانه';

const ALL_STEPS = [
  { key: 'category', label: 'دسته‌بندی پرداخت' },
  { key: 'month', label: 'ماه' },
  { key: 'executor', label: 'نام مجری' },
  { key: 'project', label: 'پروژه' },
  { key: 'serial', label: 'سریال مجوز پرداخت' },
];

export function buildSalaryDescription({ categoryName, month, executorName, serialNumber, projectName }) {
  if (!categoryName || !executorName || !serialNumber || !projectName) return '';
  const tail = `${executorName} - ${serialNumber} / ${projectName}`;
  if (categoryName === MONTHLY_WORK) return `کارکرد ${month} - ${tail}`;
  return `${categoryName} - ${tail}`;
}

export function countSalaryAssignableRows(rows) {
  return rows.filter((row) => Number(row.data?.personnel_contact_id) && Number(row.data?.amount) > 0).length;
}

export function applySalarySharedDefaults(rows, defaults) {
  let serialIndex = 0;
  return rows.map((item) => {
    const data = { ...item.data };
    const display = { ...(item.display || {}) };

    if (defaults.category_id) {
      data.category_id = Number(defaults.category_id);
      display.category = defaults.category_name;
    }
    if (defaults.month) {
      data.month = defaults.month;
      display.month = defaults.month;
    }
    if (defaults.executor_id) {
      data.executor_id = Number(defaults.executor_id);
      display.executor = defaults.executor_name;
    }
    if (defaults.project_id) {
      data.project_id = Number(defaults.project_id);
      display.project = defaults.project_name;
    }

    const assignable = Number(data.personnel_contact_id) && Number(data.amount) > 0;
    if (defaults.serials?.length && assignable) {
      const serial = defaults.serials[serialIndex];
      serialIndex += 1;
      if (serial) {
        data.permission_serial_id = Number(serial.id);
        display.serial = serial.serial_number;
      }
    }

    display.description = buildSalaryDescription({
      categoryName: display.category,
      month: data.month,
      executorName: display.executor,
      serialNumber: display.serial,
      projectName: display.project,
    });

    const errors = [...(item.errors || [])];
    const complete = Boolean(
      data.personnel_contact_id
      && Number(data.amount) > 0
      && data.category_id
      && data.executor_id
      && data.project_id
      && data.permission_serial_id
      && data.month,
    );
    const selectable = errors.length === 0 && complete;
    return {
      ...item,
      data,
      display,
      errors,
      infos: item.infos || [],
      warnings: item.warnings || [],
      selectable,
      selected: selectable,
      is_fully_valid: selectable && (item.warnings || []).length === 0,
    };
  });
}

function assignSerialsFromStart(available, startId, count) {
  if (count <= 0) return { serials: [] };
  const startIndex = available.findIndex((item) => String(item.id) === String(startId));
  if (startIndex < 0) {
    return { error: 'سریال مجوز انتخاب‌شده قابل مصرف نیست' };
  }
  const serials = available.slice(startIndex, startIndex + count);
  if (serials.length < count) {
    return {
      error: `از سریال انتخاب‌شده فقط ${serials.length} سریال آزاد باقی مانده؛ برای این فایل ${count} سریال لازم است`,
    };
  }
  return { serials };
}

export default function SalaryImportDefaultsWizard({
  open,
  fileName,
  neededFields,
  assignableCount,
  onCancel,
  onApply,
}) {
  const steps = useMemo(
    () => ALL_STEPS.filter((step) => neededFields.includes(step.key)),
    [neededFields],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stepError, setStepError] = useState('');
  const [categories, setCategories] = useState([]);
  const [months, setMonths] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [serials, setSerials] = useState([]);
  const [values, setValues] = useState({
    category_id: '',
    month: '',
    executor_id: '',
    project_id: '',
    permission_serial_id: '',
  });

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setStepError('');
    setValues({
      category_id: '',
      month: '',
      executor_id: '',
      project_id: '',
      permission_serial_id: '',
    });

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [cat, mo, ex, pr, se] = await Promise.all([
          api.get('/salary-payment-categories'),
          api.get('/persian-months'),
          api.get('/executors'),
          api.get('/projects'),
          api.get('/permission-serials'),
        ]);
        if (cancelled) return;
        setCategories(cat.data.data || []);
        setMonths(mo.data.data || []);
        setExecutors(ex.data.data || []);
        setProjects(pr.data.data || []);
        setSerials((se.data.data || []).filter((item) => isSelectablePermit(item.status)));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || err.message || 'خطا در دریافت اطلاعات مرجع');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open]);

  if (!open || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const availableSerials = serials;

  const currentValue = () => {
    if (step.key === 'category') return values.category_id;
    if (step.key === 'month') return values.month;
    if (step.key === 'executor') return values.executor_id;
    if (step.key === 'project') return values.project_id;
    return values.permission_serial_id;
  };

  const setCurrentValue = (value) => {
    setStepError('');
    if (step.key === 'category') setValues((prev) => ({ ...prev, category_id: value }));
    else if (step.key === 'month') setValues((prev) => ({ ...prev, month: value }));
    else if (step.key === 'executor') setValues((prev) => ({ ...prev, executor_id: value }));
    else if (step.key === 'project') setValues((prev) => ({ ...prev, project_id: value }));
    else setValues((prev) => ({ ...prev, permission_serial_id: value }));
  };

  const finish = () => {
    const category = categories.find((item) => String(item.id) === String(values.category_id));
    const executor = executors.find((item) => String(item.id) === String(values.executor_id));
    const project = projects.find((item) => String(item.id) === String(values.project_id));
    let assigned = { serials: [] };

    if (neededFields.includes('serial')) {
      assigned = assignSerialsFromStart(availableSerials, values.permission_serial_id, assignableCount);
      if (assigned.error) {
        setStepError(assigned.error);
        return;
      }
    }

    onApply({
      category_id: values.category_id ? Number(values.category_id) : null,
      category_name: category?.name,
      month: values.month || null,
      executor_id: values.executor_id ? Number(values.executor_id) : null,
      executor_name: executor?.name,
      project_id: values.project_id ? Number(values.project_id) : null,
      project_name: project?.name,
      serials: assigned.serials,
    });
  };

  const goNext = () => {
    if (!currentValue()) {
      setStepError(`لطفاً ${step.label} را انتخاب کنید`);
      return;
    }
    if (step.key === 'serial') {
      const assigned = assignSerialsFromStart(availableSerials, values.permission_serial_id, assignableCount);
      if (assigned.error) {
        setStepError(assigned.error);
        return;
      }
    }
    if (isLast) {
      finish();
      return;
    }
    setStepError('');
    setStepIndex((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
    >
      <div className="ui-card w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b space-y-1" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            تکمیل فیلدهای مشترک حقوق
          </h3>
          <p className="text-sm ui-muted">
            {fileName || 'فایل اکسل'} — این مقدار روی همه ردیف‌های فایل اعمال می‌شود.
          </p>
          <p className="text-xs ui-muted">مرحله {stepIndex + 1} از {steps.length}</p>
        </div>

        <div className="p-5 space-y-4">
          {loadError && <Alert variant="error">{loadError}</Alert>}
          {stepError && <Alert variant="error">{stepError}</Alert>}

          {loading ? (
            <p className="text-sm ui-muted">در حال بارگذاری گزینه‌ها...</p>
          ) : (
            <>
              {step.key === 'category' && (
                <SelectField label={`${step.label} *`} required value={values.category_id} onChange={(e) => setCurrentValue(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </SelectField>
              )}
              {step.key === 'month' && (
                <SelectField label={`${step.label} *`} required value={values.month} onChange={(e) => setCurrentValue(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {months.map((item) => <option key={item} value={item}>{item}</option>)}
                </SelectField>
              )}
              {step.key === 'executor' && (
                <SelectField label={`${step.label} *`} required value={values.executor_id} onChange={(e) => setCurrentValue(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {executors.map((item) => <option key={item.id} value={item.id}>{executorLabel(item)}</option>)}
                </SelectField>
              )}
              {step.key === 'project' && (
                <SelectField label={`${step.label} *`} required value={values.project_id} onChange={(e) => setCurrentValue(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </SelectField>
              )}
              {step.key === 'serial' && (
                <div className="space-y-2">
                  <SelectField label={`${step.label} *`} required value={values.permission_serial_id} onChange={(e) => setCurrentValue(e.target.value)}>
                    <option value="">انتخاب کنید</option>
                    {availableSerials.map((item) => (
                      <option key={item.id} value={item.id}>{item.serial_number}</option>
                    ))}
                  </SelectField>
                  {assignableCount > 1 && (
                    <p className="text-xs ui-muted">
                      هر پرداخت به یک سریال جدا نیاز دارد. سریال انتخابی برای ردیف اول است و {assignableCount - 1} سریال آزاد بعدی به بقیه ردیف‌های معتبر اختصاص داده می‌شود.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t flex flex-wrap gap-3 justify-end" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={onCancel}>انصراف</Button>
          {stepIndex > 0 && (
            <Button variant="ghost" onClick={() => { setStepError(''); setStepIndex((prev) => prev - 1); }}>
              قبلی
            </Button>
          )}
          <Button onClick={goNext} disabled={loading || Boolean(loadError)}>
            {isLast ? 'اعمال روی همه ردیف‌ها' : 'بعدی'}
          </Button>
        </div>
      </div>
    </div>
  );
}
