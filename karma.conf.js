// Karma configuration. `npm test` runs once in headless Chrome (works in CI/containers);
// `npm run test:watch` opens a normal Chrome window and re-runs on change.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-gpu'] },
    },
    coverageReporter: { dir: require('path').join(__dirname, './coverage/kanban'), reporters: [{ type: 'html' }, { type: 'text-summary' }] },
    restartOnFileChange: true,
  });
};
