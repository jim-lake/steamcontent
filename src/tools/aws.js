const AWS = require('aws-sdk');
const s3UrlParse = require('amazon-s3-uri');

exports.init = init;
exports.s3put = s3put;

let g_s3;

function init(config) {
  AWS.config.update(config);
  g_s3 = new AWS.S3();
}

function s3put(params, done) {
  const { url, content_type, cache_control, body } = params;
  let bucket = params.bucket;
  let key = params.key;
  let region;

  let err;
  if (url) {
    try {
      const parsed_url = s3UrlParse(url);
      if (!parsed_url) {
        err = 'bad_parse';
      } else {
        bucket = parsed_url.bucket;
        region = parsed_url.region;
        key = parsed_url.key;
      }
    } catch (e) {
      err = e;
    }
  }

  if (err) {
    done(err);
  } else {
    const s3 = region ? new AWS.S3({ region }) : g_s3;
    const opts = {
      ACL: 'public-read',
      Bucket: bucket,
      Body: body,
      ContentType: content_type,
      CacheControl: cache_control,
      Key: key,
    };
    s3.putObject(opts, (err) => {
      done(err, key);
    });
  }
}
