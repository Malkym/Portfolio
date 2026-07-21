/**
 * Retour au mot de passe défini par `ADMIN_PASSWORD_HASH`.
 *
 *   npm run reset-password
 *
 * À utiliser quand le mot de passe changé depuis le panneau a été oublié.
 * Le hash stocké en base est effacé, l'authentification repart donc de la
 * variable d'environnement — que vous pouvez régénérer avec `npm run hash`.
 *
 * Toutes les sessions ouvertes sont invalidées au passage.
 */
import 'dotenv/config'
import { resetToEnvPassword, getAdminHash } from '../server/models/Credentials.js'

resetToEnvPassword()

if (getAdminHash()) {
  console.log('✓ Mot de passe réinitialisé sur ADMIN_PASSWORD_HASH (fichier .env)')
  console.log('  Toutes les sessions ouvertes ont été déconnectées.')
} else {
  console.warn('⚠ Réinitialisation faite, mais ADMIN_PASSWORD_HASH est vide.')
  console.warn('  Générez-en un : npm run hash -- "votreMotDePasse"')
  process.exitCode = 1
}
