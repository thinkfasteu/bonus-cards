const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './electron/renderer/index.tsx',
  target: 'electron-renderer',
  
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'bundle.js',
    publicPath: './',
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'electron/renderer/tsconfig.json'),
            transpileOnly: true, // Skip type checking for faster builds
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './electron/renderer/index.html',
      filename: 'index.html',
    }),
  ],
  
  devServer: {
    port: 3001,
    hot: true,
    open: false,
    static: {
      directory: path.join(__dirname, 'dist/renderer'),
    },
  },
  
  devtool: 'source-map',
};