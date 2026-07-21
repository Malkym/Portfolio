/**
 * Génère le hash bcrypt du mot de passe administrateur.
 *
 *   npm run hash -- "monMotDePasse"
 *
 * Le mot de passe en clair n'est jamais stocké nulle part : seul le hash
 * va dans le .env, et bcrypt est volontairement lent pour rendre une
 * attaque par force brute coûteuse même si le fichier fuite un jour.
 */
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('\nUsage : npm run hash -- "votreMotDePasse"\n')
  process.exit(1)
}

if (password.length < 10) {
  console.error('\n⚠ Mot de passe trop court : 10 caractères minimum.\n')
  process.exit(1)
}

// 12 tours : ~250 ms par vérification. Assez lent pour dissuader,
// assez rapide pour ne pas gêner une connexion légitime.
const hash = bcrypt.hashSync(password, 12)

console.log('\nÀ copier dans votre fichier .env :\n')
console.log(`ADMIN_PASSWORD_HASH=${hash}`)
console.log(`JWT_SECRET=${randomBytes(48).toString('hex')}`)
console.log(`VISITOR_SALT=${randomBytes(24).toString('hex')}`)
console.log('')
