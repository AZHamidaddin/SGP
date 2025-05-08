// babel.config.js
module.exports = {
    presets: [
      // Compile to the current Node version
      ['@babel/preset-env', { targets: { node: 'current' } }],
      // Enable JSX
      '@babel/preset-react'
    ],
  };
  