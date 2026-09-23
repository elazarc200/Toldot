const http = require("http");

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () =>
          resolve({ status: r.statusCode, headers: r.headers, body: d }),
        );
      })
      .on("error", reject);
  });
}

(async () => {
  const port = Number(process.argv[2] || 3000);
  const r = await get(`http://127.0.0.1:${port}/map`);
  const scripts = [...r.body.matchAll(/src="(\/_next\/static[^"]+)"/g)].map(
    (m) => m[1],
  );
  const css = [...r.body.matchAll(/href="(\/_next\/static[^"]+\.css)"/g)].map(
    (m) => m[1],
  );
  console.log(
    JSON.stringify(
      { htmlBytes: r.body.length, scriptTags: scripts.length, cssTags: css.length },
      null,
      2,
    ),
  );
  let total = 0;
  const chunks = [];
  for (const s of [...scripts, ...css]) {
    const f = await get(`http://127.0.0.1:${port}${s}`);
    total += f.body.length;
    chunks.push({ kb: +(f.body.length / 1024).toFixed(1), path: s });
  }
  chunks.sort((a, b) => b.kb - a.kb);
  console.log(
    JSON.stringify(
      {
        totalTransferKb: +(total / 1024).toFixed(1),
        largest: chunks.slice(0, 12),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
