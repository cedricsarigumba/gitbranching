const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const loggerConfig = require("../config/logger-config");

const loggerFormat = printf(({ level, message, timestamp, stack }) => {
  return stack ? `${timestamp} [${level}]: ${message} ${stack}` : `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(timestamp(loggerConfig.format), format.errors({ stack: true }), loggerFormat),
  transports: [
    new transports.File({ filename: `${loggerConfig.location}${loggerConfig.errFilename}`, level: "error" }),
    new transports.File({
      filename: `${loggerConfig.location}${loggerConfig.filename}`,
      maxsize: loggerConfig.maxSize,
      maxFiles: loggerConfig.maxFiles
    })
  ]
});

// If we're not in production then **ALSO** log to the `console` and change level to `debug`
if ("prd" !== process.env["PROFILE"]) {
  logger.add(new transports.Console({ format: format.combine(format.colorize(), loggerFormat), level: "debug" }));
}

module.exports = logger;
