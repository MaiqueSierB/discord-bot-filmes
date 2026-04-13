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

            if (interaction.customId.startsWith('filme_escolha_')) {

                const [, , id, tipo] = interaction.customId.split('_');

                const movie = await getMovieDetails(id, tipo);

                const titulo = movie.title || movie.name;
                const data = movie.release_date || movie.first_air_date;

                const posterUrl = movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : null;

                const embed = new EmbedBuilder()
                    .setTitle(`${titulo} (${data ? new Date(data).getFullYear() : 's/ano'})`)
                    .setDescription(movie.overview || "Sem descrição.")
                    .addFields({
                        name: "Nota TMDB",
                        value: movie.vote_average.toFixed(1),
                        inline: true
                    });

                if (posterUrl) embed.setThumbnail(posterUrl);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avaliar_filme_${id}_${tipo}`)
                        .setLabel('Dar nota')
                        .setStyle(ButtonStyle.Success)
                );

                await interaction.update({
                    embeds: [embed],
                    components: [row]
                });
            }

            if (interaction.customId.startsWith('avaliar_filme_')) {

                const [, , id, tipo] = interaction.customId.split('_');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_${id}_${tipo}`)
                    .setTitle('Avaliar');

                const input = new TextInputBuilder()
                    .setCustomId('nota')
                    .setLabel('Nota (0-10)')
                    .setStyle(TextInputStyle.Short);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await interaction.showModal(modal);
            }

            return;
        }

        // ================= MODAL =================
        if (interaction.isModalSubmit()) {

            const [, id] = interaction.customId.split('_');
            const nota = parseFloat(interaction.fields.getTextInputValue('nota'));

            await interaction.reply({
                content: `✅ Nota registrada: ${nota}`,
                ephemeral: true
            });

            return;
        }

        // ================= COMANDOS =================
        if (interaction.isChatInputCommand()) {

            const { commandName } = interaction;

            if (commandName === 'filme') {

                await interaction.deferReply();

                const titulo = interaction.options.getString('titulo');
                const results = await searchMovie(titulo);

                if (!results.length) {
                    return interaction.editReply("Nada encontrado.");
                }

                const embed = new EmbedBuilder()
                    .setTitle("Resultados")
                    .setDescription(
                        results.map((m, i) =>
                            `${i + 1}. ${m.title} ${m.media_type === "tv" ? "📺" : "🎬"}`
                        ).join('\n')
                    );

                const row = new ActionRowBuilder().addComponents(
                    results.map((m, i) =>
                        new ButtonBuilder()
                            .setCustomId(`filme_escolha_${m.id}_${m.media_type}`)
                            .setLabel(`${i + 1}`)
                            .setStyle(ButtonStyle.Primary)
                    )
                );

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

            if (commandName === 'recomendar') {

                await interaction.deferReply();

                const genero = interaction.options.getString('genero');
                const filmes = await getMoviesByGenre(genero);

                const embed = new EmbedBuilder()
                    .setTitle("🎯 Recomendações")
                    .setDescription(
                        filmes.slice(0, 10).map(f => `• ${f.title}`).join('\n')
                    );

                await interaction.editReply({ embeds: [embed] });
            }
        }

    } catch (err) {
        console.error(err);

        if (interaction.deferred) {
            await interaction.editReply("Erro");
        } else {
            await interaction.reply({ content: "Erro", ephemeral: true });
        }
    }
});

client.login(config.token);