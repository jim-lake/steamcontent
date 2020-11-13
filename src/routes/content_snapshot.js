const express = require('express');

const db = require('../tools/db');
const util = require('../tools/util');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_snapshot', getSnapshotList);
router.get('/api/1/content_snapshot/:content_snapshot_id', getSnapshot);

function getSnapshotList(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const content_bundle_id = util.requiredProp(req, 'content_bundle_id');

  const sql = `
SELECT *
  FROM content_snapshot
  WHERE content_bundle_id = ?
`;
  db.queryFromPool(sql, [content_bundle_id], (err, results) => {
    if (err) {
      util.errorLog('content_snapshot.getPublishedList sql err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_snapshot_list: results });
    }
  });
}

function getSnapshot(req, res) {
  const { content_snapshot_id } = req.params;

  const sql = `
SELECT *
  FROM content_snapshot
  WHERE content_snapshot_id = ?
`;
  db.queryFromPool(sql, [content_snapshot_id], (err, results) => {
    if (err) {
      util.errorLog('content_snapshot.getPublishedList sql err:', err);
      res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
      res.sendStatus(500);
    } else if (results.length === 0) {
      res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
      res.sendStatus(404);
    } else {
      res.header('Cache-Control', 'public, max-age=1');
      const result = results[0];
      const content = util.jsonParse(result.content_json);
      res.send(content);
    }
  });
}
