import logger from '../utils/logger.js'

export function authRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    req.user = { role };
    next();
  };
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500

  logger.error(`[${req.method}] ${req.originalUrl} -> ${err.message}`)

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  })
}
