/**
 * Global Express error handler.
 * Catches unhandled errors from routes/middleware and returns structured JSON.
 */
function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
