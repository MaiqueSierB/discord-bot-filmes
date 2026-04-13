const API_KEY = process.env.TMDB_API_KEY;

// 🔎 BUSCA FILME + SÉRIE (COM FILTRO TOP)
export async function searchMovie(nome) {
    const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
    );

    const data = await res.json();

    return data.results
        .filter(r =>
            (r.media_type === "movie" || r.media_type === "tv") &&
            r.vote_count > 50 &&          // 👈 remove lixo
            r.poster_path !== null        // 👈 só coisa com imagem
        )
        .sort((a, b) => b.popularity - a.popularity) // 👈 mais popular primeiro
        .slice(0, 5)
        .map(r => ({
            id: r.id,
            title: r.title || r.name,
            media_type: r.media_type
        }));
}

// 📄 DETALHES (FILME OU SÉRIE)
export async function getMovieDetails(id, tipo = "movie") {
    const res = await fetch(
        `https://api.themoviedb.org/3/${tipo}/${id}?api_key=${API_KEY}&language=pt-BR`
    );

    return await res.json();
}

// 🎯 RECOMENDAÇÕES
export async function getMovieRecommendations(id) {
    const res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${API_KEY}&language=pt-BR`
    );

    const data = await res.json();

    return (data.results || [])
        .filter(r => r.vote_count > 50 && r.poster_path)
        .sort((a, b) => b.popularity - a.popularity);
}

// 🎭 POR GÊNERO
export async function getMoviesByGenre(genreId) {
    const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=pt-BR&sort_by=popularity.desc`
    );

    const data = await res.json();

    return (data.results || [])
        .filter(r => r.vote_count > 50 && r.poster_path);
}