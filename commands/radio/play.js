const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Stream radio from a .m3u8 link')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The .m3u8 link of the radio stream')
                .setRequired(true)) // Parameter for the .m3u8 URL
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Permissions required

    async execute(interaction) {
        try {
            const channel = interaction.member.voice.channel;

            if (!channel) {
                return await interaction.reply('You need to be in a voice channel to stream audio!');
            }

            // Join the voice channel
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const radioStreamUrl = interaction.options.getString('url'); // Get the URL parameter

            // Construct the path to FFmpeg
            const ffmpegPath = path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg');

            // Use FFmpeg to stream from the .m3u8 link
            const ffmpeg = spawn(ffmpegPath, [
                '-i', radioStreamUrl,   // Input: radio stream URL
                '-f', 'opus',
                '-b:a', '64k',          // Bitrate
                '-ar', '48000',
                '-ac', '2',
                'pipe:1'
            ]);

            const resource = createAudioResource(ffmpeg.stdout);
            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            // Respond to the interaction
            await interaction.deferReply();
            await interaction.followUp('Now streaming radio!');

            // Handle player events
            player.on(AudioPlayerStatus.Playing, () => {
                console.log('Player is now playing!');
            });

            player.on('error', (error) => {
                console.error('Error in player:', error);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                connection.disconnect();
            });

            ffmpeg.on('error', (err) => {
                console.error('FFmpeg error:', err);
                interaction.followUp('An error occurred while trying to stream audio.');
            });

            ffmpeg.on('exit', (code) => {
                console.log(`FFmpeg exited with code ${code}`);
                connection.disconnect();
            });
        } catch (error) { // Catch errors
            console.error('An error occurred:', error);
            await interaction.reply({ content: 'There was an error while running the command.' });
        }
    },
};
