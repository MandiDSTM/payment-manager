const db = require('../config/db-config');
const { USAGE_LOCATIONS } = require('../constants/commercialPayments');
const { consumeSerial, releaseSerial } = require('./serialService');

const buildDescription = ({ businessName, executorName, serialNumber, projectName }) =>
    [businessName, executorName, `${serialNumber} / ${projectName}`]
        .filter(Boolean)
        .join(' - ');

const loadPaymentContext = async ({
    business_contact_id: businessContactId,
    executor_id: executorId,
    project_id: projectId,
    permission_serial_id: permissionSerialId,
}) => {
    const [contact, executor, project, serial] = await Promise.all([
        db('business_contacts').where({ id: businessContactId }).first(),
        db('executors').where({ id: executorId }).first(),
        db('projects').where({ id: projectId }).first(),
        db('payment_permission_serials').where({ id: permissionSerialId }).first(),
    ]);

    return { contact, executor, project, serial };
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
    consumeSerial: (serialId, trx) => consumeSerial(serialId, USAGE_LOCATIONS.COMMERCIAL, trx),
    releaseSerial,
    resolveRecordedByUserId,
};
