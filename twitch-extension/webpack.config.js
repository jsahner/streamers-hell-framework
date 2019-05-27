const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const CleanWebpackPlugin = require("clean-webpack-plugin");

// defines where the bundle file will live
const bundlePath = path.resolve(__dirname, "dist/");

module.exports = (_env, argv) => {
  const entryPoints = {
    VideoComponent: {
      path: "./src/VideoComponent.tsx",
      outputHtml: "video_component.html",
      build: false
    },
    VideoOverlay: {
      path: "./src/VideoOverlay.tsx",
      outputHtml: "video_overlay.html",
      build: true
    },
    Panel: {
      path: "./src/Panel.tsx",
      outputHtml: "panel.html",
      build: false
    },
    Config: {
      path: "./src/Config.tsx",
      outputHtml: "config.html",
      build: true
    },
    LiveConfig: {
      path: "./src/LiveConfig.tsx",
      outputHtml: "live_config.html",
      build: true
    },
    Mobile: {
      path: "./src/Mobile.tsx",
      outputHtml: "mobile.html",
      build: false
    }
  };

  const entry = {};

  // edit webpack plugins here!
  const plugins = [
    new CleanWebpackPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new Dotenv({
      path: argv.mode === "production" ? "./.env" : "./.env.dev"
    })
  ];

  for (name in entryPoints) {
    if (entryPoints[name].build) {
      entry[name] = entryPoints[name].path;
      if (argv.mode === "production") {
        plugins.push(
          new HtmlWebpackPlugin({
            inject: true,
            chunks: [name],
            template: "./template.html",
            filename: entryPoints[name].outputHtml
          })
        );
      }
    }
  }

  const config = {
    // entry points for webpack- remove if not used/needed
    entry,
    optimization: {
      minimize: false // neccessary to pass Twitch's review process
      // splitChunks: {
      //   cacheGroups: {
      //     default: false,
      //     vendors: false,
      //     vendor: {
      //       chunks: "all",
      //       test: /node_modules/,
      //       name: false
      //     }
      //   },
      //   name: false
      // }
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /(node_modules|bower_components)/,
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript"
            ],
            plugins: [
              "styled-components",
              "@babel/proposal-class-properties",
              "@babel/proposal-object-rest-spread"
            ]
          }
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        },
        {
          test: /\.scss$/,
          use: ["style-loader", "css-loader", "sass-loader"]
        },
        {
          test: /\.(jpe?g|png|gif|svg)$/i,
          loader: "file-loader",
          options: {
            name: "img/[name].[ext]"
          }
        }
      ]
    },
    resolve: { extensions: ["*", ".js", ".jsx", ".ts", ".tsx"] },
    output: {
      filename: "[name].bundle.js",
      path: bundlePath
    },
    plugins
  };
  if (argv.mode === "development") {
    config.devServer = {
      contentBase: path.join(__dirname, "public"),
      host: argv.devrig ? "localhost.rig.twitch.tv" : "localhost",
      headers: { "Access-Control-Allow-Origin": "*" },
      port: 8080
    };
  }

  return config;
};
