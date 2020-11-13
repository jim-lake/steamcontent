const express = require('express');

const db = require('../tools/db');
const util = require('../tools/util');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_set', getContentSets);

function getContentSets(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');

  const sql = 'SELECT * FROM content_set';
  db.queryFromPool(sql, [], (err, results) => {
    if (err) {
      util.errorLog('content_set.getContentSets sql err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_set_list: results });
    }
  });
}
