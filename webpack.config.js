const config = {
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          require.resolve("style-loader"),
          {
            loader: require.resolve("css-loader"),
            options: {
              modules: true,
            },
          },
          require.resolve("less-loader"),
        ],
        exclude: /node_modules/,
      },
    ],
  },
};

module.exports = config;
