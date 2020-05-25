/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

var coverage = process.env.COVERAGE;

if (coverage) {

  // must set NODE_ENV to coverage to activate
  // babel-plugin-istanbul (cf. babel config)
  process.env.NODE_ENV = 'coverage';
}

var path = require('path');
var os = require('os');

var platform = os.platform();
var windows = /^win/.test(platform);

var { DefinePlugin } = require('webpack');

var absoluteBasePath = path.resolve(__dirname);
var resourcePath = path.resolve(__dirname + '/resources');

/* global process */

// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox', 'IE', 'PhantomJS' ]
var browsers =
  (process.env.TEST_BROWSERS || 'ChromeHeadless')
    .replace(/^\s+|\s+$/, '')
    .split(/\s*,\s*/g)
    .map(function(browser) {
      if (browser === 'ChromeHeadless') {
        process.env.CHROME_BIN = require('puppeteer').executablePath();

        // workaround https://github.com/GoogleChrome/puppeteer/issues/290
        if (process.platform === 'linux') {
          return 'ChromeHeadless_Linux';
        }
      }

      return browser;
    });

var suite = coverage ? 'test/all.js' : 'test/suite.js';


module.exports = function(karma) {
  karma.set({

    frameworks: [
      'mocha',
      'sinon-chai'
    ],

    files: [
      suite
    ],

    preprocessors: {
      [suite]: [ 'webpack', 'env' ]
    },

    reporters: [ 'spec' ].concat(coverage ? 'coverage' : []),

    customLaunchers: {
      ChromeHeadless_Linux: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        debug: true
      }
    },

    coverageReporter: {
      reporters: [
        { type: 'lcov', subdir: '.' }
      ]
    },

    browsers: browsers,

    browserNoActivityTimeout: 30000,

    singleRun: true,
    autoWatch: false,

    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: 'babel-loader'
          },
          {
            oneOf: [
              {
                test: /[/\\][A-Z][^/\\]+\.svg$/,
                use: 'react-svg-loader'
              },
              {
                test: /\.(bpmn|cmmn|dmn)$/,
                use: 'raw-loader'
              },
              {
                test: /\.css$/,
                use: [
                  'style-loader',
                  cssLoader()
                ]
              },
              {
                test: /\.less$/,
                use: [
                  'style-loader',
                  cssLoader(),
                  'less-loader'
                ]
              },
              {

                // exclude files served otherwise
                exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
                loader: 'file-loader',
                options: {
                  name: 'static/media/[name].[hash:8].[ext]',
                }
              }
            ]
          }
        ]
      },
      plugins: [
        new DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify('test'),
            WINDOWS: JSON.stringify(windows)
          }
        })
      ],
      resolve: {
        mainFields: [
          'dev:module',
          'browser',
          'module',
          'main'
        ],
        modules: [
          'node_modules',
          absoluteBasePath,
          resourcePath
        ],
        alias: {
          'bpmn-js/lib/Modeler': process.env.modelers ? 'bpmn-js/lib/Modeler' : 'test/mocks/bpmn-js/Modeler',
          'cmmn-js/lib/Modeler': process.env.modelers ? 'cmmn-js/lib/Modeler' : 'test/mocks/cmmn-js/Modeler',
          'dmn-js/lib/Modeler': process.env.modelers ? 'dmn-js/lib/Modeler' : 'test/mocks/dmn-js/Modeler',
          './DmnModeler': process.env.modelers ? './DmnModeler' : 'test/mocks/dmn-js/Modeler',
          './CodeMirror': 'test/mocks/code-mirror/CodeMirror',
          'sourcemapped-stacktrace': 'test/mocks/sourcemapped-stacktrace'
        }
      }
    }
  });
};

// helpers //////////

function cssLoader() {
  return {
    loader: 'css-loader',
    options: {
      localIdentName: '[path][name]__[local]--[hash:base64:5]'
    }
  };
}