module.exports = {
  translate(text) {
    return undefined;
  },
  generateStableHash(str) {
    return require('crypto').createHash('sha256').update(str).digest('hex').substring(0, 16);
  },
  ignoreFiles: ['src/assets/', 'src/locales/'],
};
