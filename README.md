# 🎵 appHarmonia

Aplicació web per a correcció col·laborativa de partitures d'harmonia.

## ✨ Funcionalitats

- 📤 Pujar fotografies de partitures d'harmonia
- ✏️ Anotar sobre les imatges (dibuixar, afegir text, línies)
- 💬 Sistema de comentaris per a suggerències
- 👥 Col·laboració multi-usuari
- 💾 Emmagatzematge local amb SQLite

## 🚀 Desplegament Ràpid

```bash
# 1. Clonar el repositori
git clone https://github.com/TU_USUARI/appHarmonia.git
cd appHarmonia

# 2. Iniciar amb Docker
docker-compose up -d

# 3. Inicialitzar base de dades
docker-compose exec backend npm run init-db