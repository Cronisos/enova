// Page affichée pendant le démarrage (base, serveur, interface) : l'étape en cours.

// Étoiles du fond : tirées d'une graine fixe (les mêmes à chaque lancement, comme sur l'image d'aperçu du dépôt), une
// fois, et redessinées si la fenêtre change de taille. Aucune animation.
function etoiles() {
  const toile = document.getElementById('ciel');
  if (!toile) return;
  const l = toile.clientWidth;
  const h = toile.clientHeight;
  toile.width = l;
  toile.height = h;
  const c = toile.getContext('2d');
  let graine = 11;
  const hasard = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  const nombre = Math.round((l * h) / 3200);
  for (let i = 0; i < nombre; i++) {
    c.globalAlpha = hasard() * 0.6 + 0.12;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(hasard() * l, hasard() * h, hasard() * 1.3 + 0.3, 0, 7);
    c.fill();
  }
}
etoiles();
window.addEventListener('resize', etoiles);

window.eliteBureau.surEtape((t) => {
  document.getElementById('etape').textContent = t;
});
document.getElementById('r').addEventListener('click', () => window.eliteBureau.reduire());
document.getElementById('x').addEventListener('click', () => window.eliteBureau.fermer());
