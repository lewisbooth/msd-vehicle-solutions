const generateSitemap = require("sitemap-generator");
const fs = require('fs')

const timeout = 3600000 // 1 hour expiry
const sitemapFile = process.env.ROOT + '/public/sitemap.xml'

exports.generate = () => {
  const sitemap = generateSitemap(process.env.PUBLIC_URL, {
    stripQuerystring: true,
    changeFreq: 'weekly',
    filepath: sitemapFile
  });

  sitemap.on('done', () => {
    console.log('🤖  Successfully created sitemap.xml')
  });

  let lastModified = 0
  if (fs.existsSync(sitemapFile)) {
    lastModified = fs.statSync(sitemapFile).mtimeMs;
  }

  const currentTime = new Date().getTime()

  if (currentTime - lastModified < timeout) {
    console.log('Sitemap is up to date')
    return
  } else {
    console.log("Generating new sitemap...")
    sitemap.start();
  }
}