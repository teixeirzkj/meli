/*
 * Service worker mínimo e propositalmente conservador.
 *
 * Regra número um: HTML nunca sai do cache. Página velha servida por service
 * worker é o tipo de bug que some do log e aparece na mão do usuário como
 * "não atualizou". Aqui navegação é sempre rede; o cache só guarda os assets
 * de /_next/static, cujo nome muda a cada build, e a página de offline.
 */
const VERSAO = "rotas-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll([OFFLINE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede sempre. Sem conexão, mostra a página de offline.
  if (requisicao.mode === "navigate") {
    evento.respondWith(
      fetch(requisicao).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Assets imutáveis (o hash no nome muda a cada build).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.match(requisicao).then(
        (acerto) =>
          acerto ??
          fetch(requisicao).then((resposta) => {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
            return resposta;
          }),
      ),
    );
  }
});
