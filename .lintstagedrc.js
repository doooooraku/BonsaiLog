module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,jsx,mjs}': ['prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
