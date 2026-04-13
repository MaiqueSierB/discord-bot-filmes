import fetch from "node-fetch";

const API_KEY = process.env.TMDB_API_KEY;

// 🔎 BUSCA FILME + SÉRIE
export async function searchMovie(nome) {
    const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(nome)}&language=pt-BR`
    );

    const data = await res.json();

    return data.results
        .filter(r => r.media_type === "movie" || r.media_type === "tv")
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

// 🎯 RECOMENDAÇÕES (mantive filme por padrão)
export async function getMovieRecommendations(id) {
    const res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${API_KEY}&language=pt-BR`
    );

    const data = await res.json();
    return data.results || [];
}

// 🎭 POR GÊNERO
export async function getMoviesByGenre(genreId) {
    const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=pt-BR`
    );

    const data = await res.json();
    return data.results || [];
}