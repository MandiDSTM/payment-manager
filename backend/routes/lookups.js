const express = require('express');
const { requireReadAccess, requireAdmin } = require('../middleware/authorize');
const {
    getCategories,
    getSalaryCategories,
    getMachineryCategories,
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
router.get('/salary-payment-categories', requireReadAccess, getSalaryCategories);
router.get('/machinery-payment-categories', requireReadAccess, getMachineryCategories);
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
