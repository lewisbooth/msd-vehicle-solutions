var feed = new Instafeed({
  get: "user",
  userId: "4356827122",
  clientId: "fd682540ff18414c9ef614e553b93a49",
  accessToken: "4608838305.fd68254.4931207292a54cdeba2ef44382fcfda8",
  resolution: "low_resolution",
  sortBy: "most-recent",
  limit: "20",
  template:
    "<a href={{link}} target='_blank' style='background-image: url({{image}}); background-size: cover; background-position: center;'/>"
});

feed.run();
