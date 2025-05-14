export default function authRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    req.user = { role };
    next();
  };
}
