module.exports = {
  location: "./tmp/log/",
  filename: "se-search-execution.log",
  errFilename: "se-search-execution-error.log",
  maxSize: 1024 * 1024 * 20,
  maxFiles: 10,
  format: {
    format: "YYYY-MM-DD HH:mm:ss"
  }
};
