import Database from 'better-sqlite3';

const db = new Database('servidor.sqlite');

// Tabela já existente: resultado final das avaliações de filmes
db.prepare(`
  CREATE TABLE IF NOT EXISTS avaliacoes_filmes (
    movie_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    poster_url TEXT,
    server_score REAL NOT NULL,
    vote_count INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// NOVA TABELA: votos individuais (quem avaliou o quê)
// 👉 Isso NÃO apaga nem altera nada da tabela avaliacoes_filmes.
db.prepare(`
  CREATE TABLE IF NOT EXISTS votos_filmes (
    movie_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    score REAL NOT NULL,
    PRIMARY KEY (movie_id, user_id)
  )
`).run();

export default db;
