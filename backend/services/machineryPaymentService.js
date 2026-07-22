const db = require('../config/db-config');
const { USAGE_LOCATIONS } = require('../constants/permissionSerials');
const { MONTHLY_WORK_CATEGORY } = require('../constants/machineryPayments');

const buildDescription = ({
    categoryName,
    month,
    machineName,
    executorName,
    serialNumber,
    projectName,
}) => {
    const tail = `${machineName} - ${executorName} - ${serialNumber} / ${projectName}`;

    if (categoryName === MONTHLY_WORK_CATEGORY) {
        return `کارکرد ${month} - ${tail}`;
    }

    return `${categoryName} ماشین آلات - ${tail}`;
};

const loadPaymentContext = async ({
    machinery_contact_id: machineryContactId,
    category_id: categoryId,
    executor_id: executorId,
    project_id: projectId,
    permission_serial_id: permissionSerialId,
}) => {
    const [contact, category, executor, project, serial] = await Promise.all([
        db('machinery_contacts as mc')
            .leftJoin('machines as m', 'mc.machine_id', 'm.id')
            .where('mc.id', machineryContactId)
            .select('mc.*', 'm.name as machine_name')
            .first(),
        db('machinery_payment_categories').where({ id: categoryId }).first(),
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
    USAGE_LOCATION: USAGE_LOCATIONS.MACHINERY,
};
