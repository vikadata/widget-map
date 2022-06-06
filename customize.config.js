const createBundler = require('@vikadata/widget-webpack-bundler').default;

const createConfig = (config) => {
  config.module.rules.push({
    test: /\.less$/,
    use: [
      require.resolve('style-loader'),
      {
        loader: require.resolve('css-loader'),
        options: {
          modules: true,
        },
      },
      require.resolve('less-loader'),
    ],
    exclude: /node_modules/
  })
  return config;
}

exports.default = createBundler(createConfig);