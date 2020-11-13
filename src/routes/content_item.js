const express = require('express');

const db = require('../tools/db');
const util = require('../tools/util');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_item', getContentItems);
router.post('/api/1/content_item', addContentItem);
router.post('/api/1/content_item/:content_item_id', updateContentItem);
router.delete('/api/1/content_item/:content_item_id', deleteContentItem);

function getContentItems(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const content_version_id = util.requiredProp(req, 'content_version_id');

  const sql = `
SELECT *
  FROM content_item
  WHERE content_version_id = ?
  ORDER BY order_index ASC, content_item_id ASC
`;
  db.queryFromPool(sql, [content_version_id], (err, results) => {
    if (err) {
      util.errorLog('content_item.getContentItems sql err:', err);
      res.sendStatus(500);
    } else {
      results.forEach((r) => {
        r.content = JSON.parse(r.content_json);
        delete r.content_json;
      });
      res.send({ content_item_list: results });
    }
  });
}
function addContentItem(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const content_version_id = util.requiredProp(req, 'content_version_id');
  const content_item_name = util.requiredProp(req, 'content_item_name');
  const content = util.requiredOject(req, 'content');
  const order_index = util.optionalProp(req, 'order_index') || 0;

  const content_json = JSON.stringify(content);

  const sql = 'INSERT INTO content_item SET ?';
  const obj = {
    content_version_id,
    content_item_name,
    content_json,
    order_index,
  };
  db.queryFromPool(sql, [obj], (err, result) => {
    if (err) {
      util.errorLog('content_item.addContentItem: err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_item_id: result.indexId });
    }
  });
}
function updateContentItem(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_item_id } = req.params;
  const content_item_name = util.optionalProp(req, 'content_item_name');
  const content = util.optionalObject(req, 'content');
  const order_index = util.optionalProp(req, 'order_index');

  const obj = {};
  if (content_item_name) {
    obj.content_item_name = content_item_name;
  }
  if (content) {
    obj.content_json = JSON.stringify(content);
  }
  if (order_index !== undefined) {
    obj.order_index = order_index;
  }

  const sql = 'UPDATE content_item SET ? WHERE content_item_id = ?';
  db.queryFromPool(sql, [obj, content_item_id], (err, result) => {
    if (err) {
      util.errorLog('content_item.updateContentItem: err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_item_id: result.indexId });
    }
  });
}
function deleteContentItem(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_item_id } = req.params;

  const sql = 'DELETE FROM content_item WHERE content_item_id = ?';
  db.queryFromPool(sql, [content_item_id], (err) => {
    if (err) {
      util.errorLog('content_item.deleteContentItem: err:', err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
}
