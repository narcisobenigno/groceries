export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@groceries/event-sourcing(.*)$": "<rootDir>/oss/event-sourcing/src$1",
    "^@groceries/domain-events(.*)$": "<rootDir>/packages/domain-events/src$1",
    "^@groceries/app(.*)$": "<rootDir>/apps/app/src$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        isolatedModules: true,
      },
    ],
  },
  testTimeout: 10000,
};
