export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs", "cjs"],
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.test.cjs"],
  verbose: true,
  setupFilesAfterEnv: ["./jest.setup.cjs"],
  injectGlobals: true,
};
