const db = require('../config/db-config');
const {
    PERMIT_STATUSES,
    SELECTABLE_STATUSES,
} = require('../constants/permissionSerials');

const findLinkedPayment = async (serialId, trx = db) => {
    const tables = [
        { table: 'commercial_payments', column: 'permission_serial_id' },
        { table: 'salary_payments', column: 'permission_serial_id' },
        { table: 'machinery_payments', column: 'permission_serial_id' },
    ];

    for (const { table, column } of tables) {
        const hasTable = await trx.schema.hasTable(table);
        if (!hasTable) continue;

        const linked = await trx(table).where({ [column]: serialId }).first();
        if (linked) return { table, payment: linked };
    }

    return null;
};

const isSelectable = (status) => SELECTABLE_STATUSES.includes(status);

const consumeSerial = async (serialId, usageLocation, trx = db) => {
    const serial = await trx('payment_permission_serials').where({ id: serialId }).first();
    if (!serial) throw new Error('SERIAL_NOT_FOUND');
    if (!isSelectable(serial.status)) throw new Error('SERIAL_NOT_AVAILABLE');

    await trx('payment_permission_serials').where({ id: serialId }).update({
        status: PERMIT_STATUSES.PAID,
        usage_location: usageLocation,
        updated_at: trx.fn.now(),
    });

    return serial;
};

const releaseSerial = async (serialId, trx = db) => {
    if (!serialId) return;

    await trx('payment_permission_serials').where({ id: serialId }).update({
        status: PERMIT_STATUSES.RAW_FORM,
        usage_location: null,
        updated_at: trx.fn.now(),
    });
};

module.exports = {
    findLinkedPayment,
    isSelectable,
    consumeSerial,
    releaseSerial,
};
