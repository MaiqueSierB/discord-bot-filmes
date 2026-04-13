import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import config from './config.js';

const commands = [

    // /filme
    new SlashCommandBuilder()
        .setName('filme')
        .setDescription('Procura um filme e abre uma enquete de avaliação.')
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('Título do filme')
                .setRequired(true)
        ),

    // /filmesavaliados
    new SlashCommandBuilder()
    .setName('filmesavaliados')
    .setDescription('Mostra a lista dos filmes avaliados pelo servidor.')
    .addStringOption(option =>
        option.setName('ordem')
            .setDescription('Como ordenar a lista')
            .setRequired(false)
            .addChoices(
                { name: 'Melhor nota', value: 'nota' },
                { name: 'Mais votados', value: 'votos' },
                { name: 'Mais recentes', value: 'recentes' }
            )
    ),


    new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra estatísticas do servidor ou de um usuário.')
    .addUserOption(option =>
        option.setName('usuario')
            .setDescription('Usuário para ver estatísticas individuais')
            .setRequired(false)
    ),


    // /recomendar
    new SlashCommandBuilder()
        .setName('recomendar')
        .setDescription('Recomenda filmes')
        .addSubcommand(sub =>
            sub.setName('filme')
                .setDescription('Recomenda filmes parecidos com um que você já gosta.')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título do filme base')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('genero')
                .setDescription('Recomenda filmes populares de um gênero específico.')
                .addStringOption(option =>
                    option.setName('genero')
                        .setDescription('Escolha o gênero')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ação', value: '28' },
                            { name: 'Comédia', value: '35' },
                            { name: 'Terror', value: '27' },
                            { name: 'Ficção Científica', value: '878' },
                            { name: 'Drama', value: '18' },
                            { name: 'Romance', value: '10749' },
                            { name: 'Animação', value: '16' },
                            { name: 'Documentário', value: '99' },
                        )
                )
        ),

    // /removefilme
    new SlashCommandBuilder()
        .setName('removefilme')
        .setDescription('Remove um filme da lista de avaliados.')
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('Título do filme a ser removido')
                .setRequired(true)
        ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('⏳ Registrando comandos de slash...');

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();
