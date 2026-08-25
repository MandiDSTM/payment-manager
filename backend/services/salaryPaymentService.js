const db = require('../config/db-config');
const { MONTHLY_WORK_CATEGORY } = require('../constants/salaryPayments');

const buildDescription = ({
    categoryName,
    month,
    personnelName,
    personnelCode,
    executorName,
    serialNumber,
    projectName,
}) => {
    const person = [String(personnelName || '').trim(), String(personnelCode || '').trim()]
        .filter(Boolean)
        .join('_');
    const tail = `${executorName} - ${serialNumber} / ${projectName}`;
    const rest = person ? `${person} - ${tail}` : tail;

    if (categoryName === MONTHLY_WORK_CATEGORY) {
        return `کارکرد ${month} - ${rest}`;
    }

    return `${categoryName} - ${rest}`;
};

const loadPaymentContext = async ({
    personnel_contact_id: personnelContactId,
    category_id: categoryId,
    executor_id: executorId,
    project_id: projectId,
    permission_serial_id: permissionSerialId,
}) => {
    const [contact, category, executor, project, serial] = await Promise.all([
        db('personnel_contacts').where({ id: personnelContactId }).first(),
        db('salary_payment_categories').where({ id: categoryId }).first(),
        db('executors').where({ id: executorId }).first(),
        db('projects').where({ id: projectId }).first(),
        db('payment_permission_serials').where({ id: permissionSerialId }).first(),
    ]);

    return { contact, category, executor, project, serial };
};

const resolveRecordedByUserId = (req) => {
    if (req.user?.id) return req.user.id;
    const headerId = Number(req.headers['x-user-id']);
    if (headerId) return headerId;
    return null;
};

module.exports = {
    buildDescription,
    loadPaymentContext,
    resolveRecordedByUserId,
};
