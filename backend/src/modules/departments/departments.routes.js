const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const redisService = require('../../services/redis.service');

// Constants
const DEPT_CACHE_TTL = 3600; // 60 minutes

// GET /departments (Public for registration)
router.get('/', async (req, res, next) => {
  try {
    const data = await redisService.getOrSetCache(
      'departments:list',
      async () => {
        const result = await pool.query(
          `SELECT d.*, u.name as hod_name, u.email as hod_email,
                  COUNT(DISTINCT c.id) as class_count,
                  COUNT(DISTINCT us.id) as student_count
           FROM departments d
           LEFT JOIN users u ON d.hod_id = u.id
           LEFT JOIN classes c ON c.department_id = d.id
           LEFT JOIN users us ON us.department_id = d.id AND us.role = 'student'
           GROUP BY d.id, u.name, u.email
           ORDER BY d.name`
        );
        return result.rows;
      },
      DEPT_CACHE_TTL
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// POST /departments
router.post('/', authenticate, authorize('departments:manage'), async (req, res, next) => {
  try {
    const { name, code, description, hodId } = req.body;
    const result = await pool.query(
      `INSERT INTO departments (name, code, description, hod_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, description, hodId]
    );
    
    // Invalidate
    await redisService.invalidatePattern('departments:*');
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Department name or code already exists.' });
    }
    next(error);
  }
});

// PATCH /departments/:id
router.patch('/:id', authenticate, authorize('departments:manage'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, hodId } = req.body;
    const result = await pool.query(
      `UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code),
       description = COALESCE($3, description), hod_id = COALESCE($4, hod_id)
       WHERE id = $5 RETURNING *`,
      [name, code, description, hodId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    
    // Invalidate
    await redisService.invalidatePattern('departments:*');
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /departments/:id/classes
router.get('/:id/classes', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await redisService.getOrSetCache(
      `departments:${id}:classes`,
      async () => {
        const result = await pool.query(
          `SELECT c.*, u.name as advisor_name
           FROM classes c
           LEFT JOIN users u ON c.faculty_advisor_id = u.id
           WHERE c.department_id = $1
           ORDER BY c.batch DESC, c.name`,
          [id]
        );
        return result.rows;
      },
      DEPT_CACHE_TTL
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
