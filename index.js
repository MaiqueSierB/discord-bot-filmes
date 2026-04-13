import {
    Client,
    Events,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

import db from "./db.js";
import config from './config.js';
import {
    searchMovie,
    getMovieDetails,
    getMovieRecommendations,
    getMoviesByGenre
} from './tmdb.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, c => {
    console.log(`✅ Bot de filmes online como ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    try {

        // ================= BOTÕES =================
        if (interaction.isButton()) {

            // 🎬 Escolher filme
            if (interaction.customId.startsWith('filme_escolha_')) {

                const movieId = parseInt(interaction.customId.replace('filme_escolha_', ''));
                const movie = await getMovieDetails(movieId);

                const posterUrl = movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : null;

                // DB
                const dbRow = db.prepare(`
                    SELECT server_score, vote_count
                    FROM avaliacoes_filmes
                    WHERE movie_id = ?
                `).get(movie.id);

                const serverScore = dbRow ? dbRow.server_score : null;
                const voteCount = dbRow ? dbRow.vote_count : 0;

                // votos
                const votos = db.prepare(`
                    SELECT username, score
                    FROM votos_filmes
                    WHERE movie_id = ?
                    ORDER BY score DESC
                `).all(movie.id);

                let quemAvaliouTexto = 'Ainda ninguém avaliou este filme no servidor.';

                if (votos.length > 0) {
                    quemAvaliouTexto = votos
                        .slice(0, 10)
                        .map(v => `• ${v.username ?? 'Usuário'} — ${v.score.toFixed(1)}`)
                        .join('\n');
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${movie.title} (${movie.release_date ? new Date(movie.release_date).getFullYear() : 's/ano'})`)
                    .setDescription(movie.overview || "Sem descrição disponível.")
                    .setColor('#E67E22')
                    .addFields(
                        {
                            name: "Nota TMDB",
                            value: movie.vote_average.toFixed(1),
                            inline: true
                        },
                        {
                            name: "Nota do servidor",
                            value: voteCount > 0
                                ? `${serverScore.toFixed(1)} (${voteCount} votos)`
                                : "Ainda sem avaliações",
                            inline: true
                        },
                        {
                            name: "Quem avaliou",
                            value: quemAvaliouTexto,
                            inline: false
                        }
                    );

                if (posterUrl) embed.setThumbnail(posterUrl);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avaliar_filme_${movie.id}`)
                        .setLabel('Dar a minha nota')
                        .setStyle(ButtonStyle.Success)
                );

                await interaction.update({
                    content: `🎬 Você selecionou: **${movie.title}**`,
                    embeds: [embed],
                    components: [row]
                });
            }

            // ⭐ abrir modal
            if (interaction.customId.startsWith('avaliar_filme_')) {

                const movieId = interaction.customId.replace('avaliar_filme_', '');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_${movieId}`)
                    .setTitle('Avaliar filme');

                const input = new TextInputBuilder()
                    .setCustomId('nota')
                    .setLabel('Nota (0-10)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await interaction.showModal(modal);
            }

            return;
        }

        // ================= MODAL =================
        if (interaction.isModalSubmit()) {

            const movieId = parseInt(interaction.customId.replace('modal_', ''));
            const nota = parseFloat(interaction.fields.getTextInputValue('nota').replace(',', '.'));

            if (isNaN(nota) || nota < 0 || nota > 10) {
                return interaction.reply({ content: 'Nota inválida', ephemeral: true });
            }

            const userId = interaction.user.id;
            const username = interaction.user.tag;

            // salva voto
            db.prepare(`
                INSERT INTO votos_filmes (movie_id, user_id, username, score)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(movie_id, user_id) DO UPDATE SET
                    score = excluded.score,
                    username = excluded.username
            `).run(movieId, userId, username, nota);

            // recalcula média
            const stats = db.prepare(`
                SELECT AVG(score) as avg, COUNT(*) as total
                FROM votos_filmes
                WHERE movie_id = ?
            `).get(movieId);

            const movie = await getMovieDetails(movieId);

            db.prepare(`
                INSERT INTO avaliacoes_filmes (movie_id, title, server_score, vote_count)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(movie_id) DO UPDATE SET
                    server_score = excluded.server_score,
                    vote_count = excluded.vote_count
            `).run(movieId, movie.title, stats.avg, stats.total);

            await interaction.reply({
                content: `✅ Nota registrada: ${nota.toFixed(1)} ⭐\nMédia: ${stats.avg.toFixed(1)} (${stats.total} votos)`,
                ephemeral: true
            });

            return;
        }

        // ================= COMANDOS =================
        if (interaction.isChatInputCommand()) {

            const { commandName } = interaction;

            // 🎬 FILME
            if (commandName === 'filme') {

                await interaction.deferReply();

                const titulo = interaction.options.getString('titulo');
                const results = await searchMovie(titulo);

                if (!results.length) {
                    return interaction.editReply("Nenhum filme encontrado.");
                }

                const top = results.slice(0, 5);

                const embed = new EmbedBuilder()
                    .setTitle(`Resultados para "${titulo}"`)
                    .setDescription(
                        top.map((m, i) => `${i + 1}. ${m.title}`).join('\n')
                    )
                    .setColor('#E67E22');

                const row = new ActionRowBuilder().addComponents(
                    top.map((m, i) =>
                        new ButtonBuilder()
                            .setCustomId(`filme_escolha_${m.id}`)
                            .setLabel(`${i + 1}`)
                            .setStyle(ButtonStyle.Primary)
                    )
                );

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

            // ⭐ LISTA
            if (commandName === 'filmesavaliados') {

                await interaction.deferReply();

                const filmes = db.prepare(`
                    SELECT title, server_score, vote_count
                    FROM avaliacoes_filmes
                    ORDER BY server_score DESC
                `).all();

                if (!filmes.length) {
                    return interaction.editReply("Sem filmes avaliados.");
                }

                const embed = new EmbedBuilder()
                    .setTitle("🎬 Filmes avaliados")
                    .setDescription(
                        filmes.map((f, i) =>
                            `${i + 1}. ${f.title} — ⭐ ${f.server_score.toFixed(1)} (${f.vote_count} votos)`
                        ).join('\n')
                    )
                    .setColor('#3498DB');

                await interaction.editReply({ embeds: [embed] });
            }

            // 🎯 RECOMENDAR
            if (commandName === 'recomendar') {

                await interaction.deferReply();

                const genero = interaction.options.getString('genero');
                const filmes = await getMoviesByGenre(genero);

                const embed = new EmbedBuilder()
                    .setTitle("🎯 Recomendações")
                    .setDescription(
                        filmes.slice(0, 10).map(f => `• ${f.title}`).join('\n')
                    )
                    .setColor('#9B59B6');

                await interaction.editReply({ embeds: [embed] });
            }

            // 📊 STATS
            if (commandName === 'stats') {
                await interaction.reply("📊 Em desenvolvimento...");
            }
        }

    } catch (err) {
        console.error("ERRO:", err);

        if (interaction.deferred || interaction.replied) {
            interaction.editReply("❌ Deu erro.");
        } else {
            interaction.reply({ content: "❌ Deu erro.", ephemeral: true });
        }
    }
});

client.login(config.token);