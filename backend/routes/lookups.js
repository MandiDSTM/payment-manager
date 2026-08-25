const express = require('express');
const { requireReadAccess, requireAdmin } = require('../middleware/authorize');
const {
    getCategories,
    createCommercialCategory,
    updateCommercialCategory,
    deleteCommercialCategory,
    getSalaryCategories,
    createSalaryCategory,
    updateSalaryCategory,
    deleteSalaryCategory,
    getMachineryCategories,
    createMachineryCategory,
    updateMachineryCategory,
    deleteMachineryCategory,
    getPersianMonths,
    getExecutors,
    createExecutor,
    updateExecutor,
    deleteExecutor,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getUsers,
} = require('../controllers/lookupsController');

const router = express.Router();

router.get('/commercial-payment-categories', requireReadAccess, getCategories);
router.post('/commercial-payment-categories', requireAdmin, createCommercialCategory);
router.put('/commercial-payment-categories/:id', requireAdmin, updateCommercialCategory);
router.delete('/commercial-payment-categories/:id', requireAdmin, deleteCommercialCategory);

router.get('/salary-payment-categories', requireReadAccess, getSalaryCategories);
router.post('/salary-payment-categories', requireAdmin, createSalaryCategory);
router.put('/salary-payment-categories/:id', requireAdmin, updateSalaryCategory);
router.delete('/salary-payment-categories/:id', requireAdmin, deleteSalaryCategory);

router.get('/machinery-payment-categories', requireReadAccess, getMachineryCategories);
router.post('/machinery-payment-categories', requireAdmin, createMachineryCategory);
router.put('/machinery-payment-categories/:id', requireAdmin, updateMachineryCategory);
router.delete('/machinery-payment-categories/:id', requireAdmin, deleteMachineryCategory);

router.get('/persian-months', requireReadAccess, getPersianMonths);

router.get('/executors', requireReadAccess, getExecutors);
router.post('/executors', requireAdmin, createExecutor);
router.put('/executors/:id', requireAdmin, updateExecutor);
router.delete('/executors/:id', requireAdmin, deleteExecutor);

router.get('/projects', requireReadAccess, getProjects);
router.post('/projects', requireAdmin, createProject);
router.put('/projects/:id', requireAdmin, updateProject);
router.delete('/projects/:id', requireAdmin, deleteProject);

router.get('/users', requireReadAccess, getUsers);

module.exports = router;
