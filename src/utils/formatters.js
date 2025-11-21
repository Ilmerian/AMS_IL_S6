export const formatDate=(d)=>new Date(d).toLocaleString();
/**
 * Génère une couleur HSL unique et lisible (mode sombre) à partir d'une chaîne.
 */
export function stringToColor(str) {
  if (!str) return '#b9c1ff'; // Couleur par défaut (primary.light)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Teinte (Hue) : 0 à 360 basé sur le hash
  const h = Math.abs(hash) % 360;
  
  // Saturation : 70% (couleurs assez vives)
  // Luminosité : 75% (clair pour être lisible sur fond sombre)
  return `hsl(${h}, 70%, 75%)`;
}