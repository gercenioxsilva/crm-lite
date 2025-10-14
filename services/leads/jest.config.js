const path = require('path');
const tsJestPath = path.resolve(__dirname, '../../node_modules/ts-jest');
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleFileExtensions: ['ts','js','json'],
  transform: { '^.+\\.ts$': [tsJestPath, { tsconfig: 'tsconfig.json' }] },
};
