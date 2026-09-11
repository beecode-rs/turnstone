import { ssh2Poly1305 } from '#src/lib/ssh2-poly1305'

module.exports = () => {
  return ssh2Poly1305.createModule()
}
