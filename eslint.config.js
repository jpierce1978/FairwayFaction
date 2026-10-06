const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', '.expo/*', 'supabase/*', 'node_modules/*'] },
];
