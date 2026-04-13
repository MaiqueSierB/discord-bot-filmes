import axios from 'axios';
import config from './config.js';

// Função para procurar um filme por título e (opcionalmente) por ano
async function searchMovie(title, year) {
    const apiParams = {
        api_key: config.tmdbApiKey,
        query: title,
        language: 'pt-BR'
    };
    if (year) {
        apiParams.primary_release_year = year;
    }
    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, { params: apiParams });
    return response.data.results;
}

// Função para obter os detalhes de um filme específico pelo seu ID
async function getMovieDetails(movieId) {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
        params: { api_key: config.tmdbApiKey, language: 'pt-BR' }
    });
    return response.data;
}

// Função para obter recomendações baseadas num filme
async function getMovieRecommendations(movieId) {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/recommendations`, {
        params: { api_key: config.tmdbApiKey, language: 'pt-BR' }
    });
    return response.data.results;
}

// Função para obter filmes populares de um género
async function getMoviesByGenre(genreId) {
    const response = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
        params: {
            api_key: config.tmdbApiKey,
            language: 'pt-BR',
            with_genres: genreId,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100
        }
    });
    return response.data.results;
}

export { searchMovie, getMovieDetails, getMovieRecommendations, getMoviesByGenre };