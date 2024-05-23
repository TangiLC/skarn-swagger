"use strict";

const fs = require('fs');
const Extractor = require('./Extractor').default;

const parseFile = (file, options, callback) => {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }

  const collected = [];

  fs.createReadStream(file, { encoding: 'utf8' })
    .on('error', callback)
    .pipe(new Extractor(options))
    .on('error', callback)
    .on('data', data => collected.push(data))
    .on('finish', () => callback(null, collected));
};

exports.default = parseFile;
