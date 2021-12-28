module.exports = {
  outputDir: '_package/frontend',
  pages: {
    index: {
      entry: 'frontend/main.js',
      template: 'frontend/public/index.html',
    },
  },
  configureWebpack: {
    devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        '@': require('path').resolve('./frontend'),
      },
      fallback: {
        path: require.resolve('path-browserify'),
      },
    },
  },
}
