exports.logging = (req, res, next) => {
  if (req.headers['user-agent'].includes('Node/SitemapGenerator')) {
    next()
    return
  }
  const timestamp = new Date().toString();
  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  console.log(`${timestamp} ${req.method} ${req.path} ${ip}`);
  if (req.method === "POST") {
    console.log(req.body);
  }
  next();
}