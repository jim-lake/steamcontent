const async = require('async');
const express = require('express');

const { getContentVersion } = require('../lib/content_builder');

const db = require('../tools/db');
const util = require('../tools/util');

const router = new express.Router();
exports.router = router;

router.get('/api/1/content_bundle', getBundleList);
router.get('/api/1/content_bundle/:content_bundle_id', getBundle);
router.all('/api/1/content_bundle/:content_bundle_id/snap', snapBundle);

function getBundleList(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const sql = `
SELECT
  content_bundle.*,
  content_version.content_version_id, content_version_name,
  content_set_id, content_set_name
FROM content_bundle
JOIN content_bundle_version_map USING (content_bundle_id)
JOIN content_version USING (content_version_id)
JOIN content_set USING (content_set_id)
`;
  db.queryFromPool(sql, [], (err, results) => {
    if (err) {
      util.errorLog('content_bundle.getBundleList: err:', err);
      res.sendStatus(500);
    } else {
      const list = [];
      results.forEach((result) => {
        const {
          content_bundle_id,
          content_bundle_name,
          content_version_id,
          content_version_name,
          content_set_id,
          content_set_name,
        } = result;
        let bundle = list.find(
          (b) => b.content_bundle_id === content_bundle_id
        );
        if (!bundle) {
          bundle = {
            content_bundle_id,
            content_bundle_name,
            content_version_list: [],
          };
          list.push(bundle);
        }
        bundle.content_version_list.push({
          content_version_id,
          content_version_name,
          content_set_id,
          content_set_name,
        });
      });
      res.send({ content_bundle_list: list });
    }
  });
}
function getBundle(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_bundle_id } = req.params;

  _getBundle(content_bundle_id, (err, bundle) => {
    if (err === 'not_found') {
      res.sendStatus(404);
    } else if (err) {
      util.errorLog('getBundle: find err:', err);
      res.sendStatus(500);
    } else {
      res.send(bundle);
    }
  });
}

function snapBundle(req, res) {
  res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
  const { content_bundle_id } = req.params;
  const content_snapshot_name = util.requiredProp(req, 'content_snapshot_name');

  let content_json;
  let content_snapshot_id;
  async.series(
    [
      (done) => {
        _getBundle(content_bundle_id, (err, bundle) => {
          if (!err) {
            content_json = JSON.stringify(bundle);
          }
          done(err);
        });
      },
      (done) => {
        const sql = 'INSERT INTO content_snapshot SET ?';
        const obj = {
          content_bundle_id,
          content_snapshot_name,
          content_json,
        };
        db.queryFromPool(sql, [obj], (err, result) => {
          if (err && err.code === 'ER_DUP_ENTRY') {
            err = 'conflict';
          } else if (err) {
            util.errorLog('content_bundle.snapBundle: insert err:', err);
          } else {
            content_snapshot_id = result.insertId;
          }
          done(err);
        });
      },
    ],
    (err) => {
      if (err === 'conflict') {
        res.sendStatus(409);
      } else if (err) {
        res.sendStatus(500);
      } else {
        res.send({ content_snapshot_id });
      }
    }
  );
}

function _getBundle(content_bundle_id, done) {
  const bundle = {
    last_updated: 0,
  };
  let version_list;
  async.series(
    [
      (done) => {
        const sql = `
SELECT content_version_id
FROM content_bundle_version_map
WHERE content_bundle_id = ?
`;
        db.queryFromPool(sql, [content_bundle_id], (err, results) => {
          if (err) {
            util.errorLog('content_bundle._getBundle: find err:', err);
          } else if (results.length === 0) {
            err = 'not_found';
          } else {
            version_list = results.map((r) => r.content_version_id);
          }
          done(err);
        });
      },
      (done) => {
        async.eachSeries(
          version_list,
          (version_id, done) => {
            getContentVersion(version_id, (err, ver) => {
              if (err) {
                util.errorLog('content_bundle._getBundle: ver err:', err);
              } else {
                const { json_name, last_updated } = ver;
                if (last_updated > bundle.last_updated) {
                  bundle.last_updated = last_updated;
                }
                bundle[json_name] = ver[json_name];
              }
              done(err);
            });
          },
          done
        );
      },
    ],
    (err) => {
      done(err, bundle);
    }
  );
}
