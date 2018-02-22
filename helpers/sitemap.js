const generateSitemap = require("sitemap-generator");
const fs = require('fs')

const timeout = 3600000 // 1 hour expiry
const sitemapFile = process.env.ROOT + '/sitemap.xml'

exports.generate = () => {
  const sitemap = generateSitemap(process.env.PUBLIC_URL, {
    stripQuerystring: true,
    changeFreq: 'weekly'
  });

  sitemap.on('done', () => {
    console.log('🤖  Successfully created sitemap.xml')
  });

  const lastModified = fs.statSync(sitemapFile).mtimeMs;
  const currentTime = new Date().getTime()

  if (currentTime - lastModified < timeout) {
    console.log('Sitemap is up to date')
    return
  } else {
    console.log("Generating new sitemap...")
    sitemap.start();
  }
}

exports.send = (req, res) => {
  if (fs.existsSync(sitemapFile)) {
    res.sendFile(sitemapFile)
  }
}