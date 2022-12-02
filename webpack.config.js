const webpack = require("webpack");
const path = require("path");
const merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const common = env => ({
  entry: "./src/index.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          { loader: "ts-loader" },
          {
            loader: "ifdef-loader",
            options: {
              MODE: env.mode
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.(png|svg|jpg|gif|mp4|ogg|mp3|wav|woff|woff2|glb|ttf|webm)$/,
        use: ["file-loader"]
      },
      {
        test: /\.css$/,
        use: [{ loader: "style-loader" }, { loader: "css-loader" }]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, `build/`)
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      templateParameters: {
        title: "Marble Mouse",
        mode: env.mode
      }
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require("./package.json").version),
      MODE: JSON.stringify(env.mode)
    })
  ]
});

const development = env => ({
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    useLocalIp: true,
    host: "0.0.0.0"
  }
});

const production = {
  mode: "production"
};

module.exports = env => {
  if (env.mode === "prod") return merge(common(env), production);
  else if (env.mode === "dev") return merge(common(env), development(env));
  else {
    throw new Error(`Unknown mode: ${env.mode}.`);
  }
};
