(() => {
  const version = Date.now();
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `styles.css?v=${version}`;
  document.head.append(stylesheet);

  window.addEventListener("DOMContentLoaded", () => {
    const app = document.createElement("script");
    app.src = `app.js?v=${version}`;
    document.body.append(app);
  });
})();
