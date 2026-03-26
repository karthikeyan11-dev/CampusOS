const { pool } = require('../../config/database');
const { ITEM_STATUS } = require('../../config/constants');
const { assessItemSimilarity } = require('../../services/ai.service');

/**
 * POST /lostfound
 */
const createItem = async (req, res, next) => {
  try {
    const { type, title, description, location, itemDate, contactInfo } = req.body;

    // Handle uploaded images
    const imageUrls = req.files
      ? req.files.map((f) => `/uploads/lostfound/${f.filename}`)
      : [];

    const result = await pool.query(
      `INSERT INTO lost_found_items (type, title, description, location, item_date, image_urls, reported_by, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [type, title, description, location, itemDate, imageUrls, req.user.id, contactInfo]
    );

    const item = result.rows[0];

    // Try to find matches
    const oppositeType = type === 'lost' ? 'found' : 'lost';
    const matches = await pool.query(
      `SELECT * FROM lost_found_items 
       WHERE type = $1 AND status = 'reported'
       AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2)
       LIMIT 5`,
      [oppositeType, `%${title.toLowerCase().split(' ')[0]}%`]
    );

    // If matches found, calculate AI similarity and create records
    const finalMatches = [];
    if (matches.rows.length > 0) {
      for (const match of matches.rows) {
        const score = await assessItemSimilarity(item, match);
        
        // Only record if similarity is above a threshold (e.g., 0.3)
        if (score > 0.3) {
          const lostId = type === 'lost' ? item.id : match.id;
          const foundId = type === 'found' ? item.id : match.id;

          await pool.query(
            `INSERT INTO item_matches (lost_item_id, found_item_id, similarity_score)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [lostId, foundId, score]
          );
          finalMatches.push({ ...match, similarityScore: score });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `${type === 'lost' ? 'Lost' : 'Found'} item reported.`,
      data: item,
      possibleMatches: finalMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /lostfound
 */
const getItems = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 0;

    if (type) { idx++; conditions.push(`lf.type = $${idx}`); params.push(type); }
    if (status) { idx++; conditions.push(`lf.status = $${idx}`); params.push(status); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT lf.*, u.name as reported_by_name
       FROM lost_found_items lf
       JOIN users u ON lf.reported_by = u.id
       ${whereClause}
       ORDER BY lf.created_at DESC
       LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /lostfound/:id
 */
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT lf.*, u.name as reported_by_name, u.email as reported_by_email, u.phone as reported_by_phone
       FROM lost_found_items lf
       JOIN users u ON lf.reported_by = u.id
       WHERE lf.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Get matches
    const item = result.rows[0];
    let matches = [];
    if (item.type === 'lost') {
      const m = await pool.query(
        `SELECT im.*, lf.title, lf.description, lf.image_urls, lf.location, u.name as reporter_name
         FROM item_matches im
         JOIN lost_found_items lf ON im.found_item_id = lf.id
         JOIN users u ON lf.reported_by = u.id
         WHERE im.lost_item_id = $1`,
        [id]
      );
      matches = m.rows;
    } else {
      const m = await pool.query(
        `SELECT im.*, lf.title, lf.description, lf.image_urls, lf.location, u.name as reporter_name
         FROM item_matches im
         JOIN lost_found_items lf ON im.lost_item_id = lf.id
         JOIN users u ON lf.reported_by = u.id
         WHERE im.found_item_id = $1`,
        [id]
      );
      matches = m.rows;
    }

    res.json({
      success: true,
      data: { ...item, matches },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /lostfound/:id/resolve
 */
const resolveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { matchedItemId } = req.body;

    const isAdmin = req.user.role === 'super_admin';
    const result = await pool.query(
      `UPDATE lost_found_items SET status = 'resolved', matched_item_id = $1, resolved_at = NOW()
       WHERE id = $2 ${isAdmin ? '' : 'AND reported_by = $3'} RETURNING *`,
      isAdmin ? [matchedItemId, id] : [matchedItemId, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found or not your report.' });
    }

    // Also resolve the matched item
    if (matchedItemId) {
      await pool.query(
        `UPDATE lost_found_items SET status = 'resolved', matched_item_id = $1, resolved_at = NOW() WHERE id = $2`,
        [id, matchedItemId]
      );
    }

    res.json({
      success: true,
      message: 'Item marked as resolved.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  resolveItem,
};
