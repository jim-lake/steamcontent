const async = require('async');
const express = require('express');

const db = require('../tools/db');
const util = require('../tools/util');
const { s3put } = require('../tools/aws');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_alias', getAliasList);
router.get('/api/1/content_alias/:content_alias_id', getAlias);
router.all('/api/1/content_alias/:content_alias_id/update_snap', updateSnap);
router.all('/api/1/content_alias/:content_alias_id/publish', publishAlias);

function getAliasList(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');

  const sql = `SELECT * FROM content_alias`;
  db.queryFromPool(sql, [], (err, results) => {
    if (err) {
      util.errorLog('content_alias.getAliasList sql err:', err);
      res.sendStatus(500);
    } else {
      res.send({ content_alias_list: results });
    }
  });
}
function getAlias(req, res) {
  const { content_alias_id } = req.params;

  const sql = `
SELECT content_snapshot.content_json
  FROM content_alias
  JOIN content_snapshot USING (content_snapshot_id)
  WHERE content_alias_id = ?
`;
  db.queryFromPool(sql, [content_alias_id], (err, results) => {
    if (err) {
      util.errorLog('content_alias.getAlias sql err:', err);
      res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
      res.sendStatus(500);
    } else if (results.length === 0) {
      res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
      res.sendStatus(404);
    } else {
      res.header('Cache-Control', 'public, max-age=10');
      const result = results[0];
      const content = util.jsonParse(result.content_json);
      res.send(content);
    }
  });
}
function updateSnap(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_alias_id } = req.params;
  const content_snapshot_id = util.requiredProp(req, 'content_snapshot_id');

  const sql = `
UPDATE content_alias
  SET content_snapshot_id = ?
  WHERE content_alias_id = ?;
INSERT INTO content_alias_history SET ?;
`;
  const obj = {
    content_alias_id,
    content_snapshot_id,
  };
  const values = [content_snapshot_id, content_alias_id, obj];
  db.queryFromPool(sql, values, (err) => {
    if (err) {
      util.errorLog('content_alias.updateSnap sql err:', err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
}
function publishAlias(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_alias_id } = req.params;

  let content_alias;
  async.series(
    [
      (done) => {
        const sql = `
SELECT content_alias.*, content_snapshot.content_json
  FROM content_alias
  JOIN content_snapshot USING (content_snapshot_id)
  WHERE content_alias_id = ?
`;
        db.queryFromPool(sql, [content_alias_id], (err, results) => {
          if (err) {
            util.errorLog('content_alias.publishAlias sql err:', err);
          } else if (results.length === 0) {
            err = 'not_found';
          } else {
            content_alias = results[0];
          }
          done(err);
        });
      },
      (done) => {
        const opts = {
          url: content_alias.s3_publish_url,
          content_type: 'application/json',
          cache_control: 'public, max-age=60',
          body: content_alias.content_json,
        };
        s3put(opts, (err) => {
          if (err) {
            util.errorLog('content_alias.publishAlias s3 err:', err);
          }
          done(err);
        });
      },
    ],
    (err) => {
      if (err === 'not_found') {
        res.sendStatus(404);
      } else if (err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    }
  );
}
