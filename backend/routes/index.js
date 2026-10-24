const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const uploadRoutes = require('./upload');
const paymentsRoutes = require('./payments');
const businessContactsRoutes = require('./businessContacts');
const machineryContactsRoutes = require('./machineryContacts');
const machinesRoutes = require('./machines');
const commercialPaymentsRoutes = require('./commercialPayments');
const machineryPaymentsRoutes = require('./machineryPayments');
const salaryPaymentsRoutes = require('./salaryPayments');
const personnelContactsRoutes = require('./personnelContacts');
const permissionSerialsRoutes = require('./permissionSerials');
const excelRoutes = require('./excel');
const lookupsRoutes = require('./lookups');
const backupRoutes = require('./backup');
const filesRoutes = require('./files');

const router = express.Router();

router.use(authRoutes);

router.use(requireAuth);

router.use(filesRoutes);
router.use(usersRoutes);
router.use(uploadRoutes);
router.use(paymentsRoutes);
router.use(businessContactsRoutes);
router.use(machineryContactsRoutes);
router.use(machinesRoutes);
router.use(commercialPaymentsRoutes);
router.use(machineryPaymentsRoutes);
router.use(salaryPaymentsRoutes);
router.use(personnelContactsRoutes);
router.use(permissionSerialsRoutes);
router.use(excelRoutes);
router.use(lookupsRoutes);
router.use(backupRoutes);

module.exports = router;
