const express = require('express');

const content_alias = require('./content_alias');
const content_bundle = require('./content_bundle');
const content_item = require('./content_item');
const content_snapshot = require('./content_snapshot');
const content_set = require('./content_set');
const content_version = require('./content_version');

const router = new express.Router();
exports.router = router;

router.use(content_alias.router);
router.use(content_bundle.router);
router.use(content_item.router);
router.use(content_set.router);
router.use(content_snapshot.router);
router.use(content_version.router);
