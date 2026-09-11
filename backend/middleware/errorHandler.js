/**
 * Centralised error-handling middleware.
 * Must be registered AFTER all routes (4-arg signature).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error('[QuickCourt Error]', err.message || err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
}
