const express = require('express');

const { getContentVersion } = require('../lib/content_builder');

const db = require('../tools/db');
const util = require('../tools/util');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_version', getVersionList);
router.post('/api/1/content_version', createVersion);
router.get('/api/1/content_version/:content_version_id', getVersion);
router.all('/api/1/content_version/:source_id/copy', copyVersion);

function getVersionList(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const content_set_id = util.requiredProp(req, 'content_set_id');

  const sql = 'SELECT * FROM content_version WHERE content_set_id = ?';
  db.queryFromPool(sql, [content_set_id], (err, results) => {
    if (err) {
      util.errorLog('content_version.getContentVersions sql err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_version_list: results });
    }
  });
}
function createVersion(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const content_set_id = util.requiredProp(req, 'content_set_id');
  const content_version_name = util.requiredProp(req, 'content_version_name');

  const sql = 'INSERT INTO content_version SET ?';
  const obj = {
    content_set_id,
    content_version_name,
  };
  db.queryFromPool(sql, [obj], (err, result) => {
    if (err) {
      util.errorLog('content_version.createVersion sql err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_version_id: result.insertId });
    }
  });
}

function getVersion(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_version_id } = req.params;

  getContentVersion(content_version_id, (err, content) => {
    if (err) {
      util.errorLog('getContentVersion: find err:', err);
      res.sendStatus(500);
    } else if (!content) {
      res.sendStatus(404);
    } else {
      res.send(content);
    }
  });
}

function copyVersion(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const source_id = req.params.content_version_id;
  const { dest_id } = req.requiredProp(req, 'dest_id');

  const sql = `
DELETE FROM content_item WHERE content_version_id = ?;
INSERT INTO content_item (
    content_version_id,
    content_item_name,
    created_time,
    last_updated,
    content_json,
    order_index
  )
  SELECT
    ? AS content_version_id,
    content_item_name,
    created_time,
    last_updated,
    content_json,
    order_index
  FROM content_item
  WHERE content_version_id = ?
  ORDER BY order_index ASC, content_item_id ASC;
`;
  const values = [dest_id, dest_id, source_id];
  db.queryFromPool(sql, values, (err) => {
    if (err) {
      util.errorLog('content_version.copyVersion: err', err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
}
