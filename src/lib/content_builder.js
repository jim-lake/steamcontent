const db = require('../tools/db');
const util = require('../tools/util');

exports.getContentVersion = getContentVersion;

function getContentVersion(content_version_id, done) {
  const sql = `
SELECT content_version.*, content_set.*
  FROM content_version
  JOIN content_set USING (content_set_id)
  WHERE content_version.content_version_id = ?;
SELECT *
  FROM content_item
  WHERE content_version_id = ?
  ORDER BY order_index ASC, content_item_id ASC;
`;
  db.queryFromPool(
    sql,
    [content_version_id, content_version_id],
    (err, results) => {
      let result;
      if (!err && results[0].length === 0) {
        err = 'not_found';
      } else if (!err) {
        const content_ver = results[0][0];
        const {
          content_version_id,
          content_version_name,
          content_set_id,
          content_set_name,
          json_name,
          created_time,
        } = content_ver;

        const content_list = _buildContentList(results[1]);
        const last_updated = results[1].reduce((memo, r) => {
          const time = r.last_updated.getTime();
          return time > memo ? time : memo;
        }, 0);
        result = {
          content_version_id,
          content_version_name,
          content_set_id,
          content_set_name,
          created_time,
          json_name,
          last_updated,
          [json_name]: content_list,
        };
      }
      done(err, result);
    }
  );
}

function _buildContentList(results) {
  const list = [];
  results.forEach((result) => {
    const content = util.jsonParse(result.content_json) || {};
    list.push(content);
  });
  return list;
}
