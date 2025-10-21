import 'dotenv/config';
import express from 'express';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  MessageFlags
} from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

const {
  BOT_TOKEN: token,
  VERIFY_CHANNEL_ID: verifyChannelId,
  ROLE_1_ID: role1Id,
  ROLE_2_ID: role2Id,
  AUTO_ROLE_ID: autoRoleId,
  ADMIN_ID: adminId,
  BANNER_URL: bannerUrl,
  GUILD_ID: guildId,
  WELCOME_CHANNEL_ID: welcomeChannelId,
  PORT
} = process.env;

// ---------------------- Express Setup ----------------------
const app = express();

// Root route
app.get('/', (req, res) => res.send('✅ Bot is running!'));

// Status route
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    bot: client.user?.tag || 'offline',
    guilds: client.guilds.cache.size,
    members: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)
  });
});

// Start Express server
app.listen(PORT || 3000, () => console.log(`🌐 Express server running on port ${PORT || 3000}`));

// ---------------------- Helper: Post Verification Banner ----------------------
async function postVerificationBanner(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    if (botMessages.size > 0) {
      await channel.bulkDelete(botMessages, true);
      console.log(`🧹 Deleted ${botMessages.size} old banner(s).`);
    }
  } catch (err) {
    console.warn('⚠️ Could not delete old messages:', err.message);
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Verify to Access the Server')
    .setDescription('Click the **Verify** button below to gain access to all channels!')
    .setColor(0x00FFAA)
    .setFooter({ text: 'Verification System' });

  if (bannerUrl) embed.setImage(bannerUrl);

  const button = new ButtonBuilder()
    .setCustomId('verify_button')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({ embeds: [embed], components: [row] });
  console.log(`📢 Verification banner posted to #${channel.name}`);
}

// ---------------------- Client Ready ----------------------
client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(verifyChannelId).catch(() => null);
  if (!channel) return console.error('⚠️ Verify channel not found.');

  await postVerificationBanner(channel);

  // Slash command registration
  const commands = [
    {
      name: 'clear',
      description: 'Delete messages in the current channel',
      options: [
        {
          name: 'amount',
          type: 4,
          description: 'Number of messages to delete (1-100)',
          required: true
        }
      ]
    },
    {
      name: 'resendbanner',
      description: 'Repost the verification banner'
    }
  ];

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

// ---------------------- Auto Role + Welcome Channel ----------------------
client.on('guildMemberAdd', async (member) => {
  if (autoRoleId) {
    const role = member.guild.roles.cache.get(autoRoleId);
    if (role) await member.roles.add(role, 'Auto role on join').catch(console.error);
  }

  try {
    const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId);
    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Welcome!')
        .setDescription(`Hi ${member}, welcome to **${member.guild.name}**!`)
        .addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: '🏷️ Role Received', value: autoRoleId ? `<@&${autoRoleId}>` : 'None', inline: true },
          { name: '🧮 Member Count', value: `You are member #${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(0x00FFAA)
        .setTimestamp()
        .setFooter({ text: 'Server Auto Welcome' });

      await welcomeChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.warn('⚠️ Could not send welcome message:', err.message);
  }
});

// ---------------------- Button Interaction (Verify) ----------------------
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'verify_button') {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const role1 = guild.roles.cache.get(role1Id);
    const role2 = guild.roles.cache.get(role2Id);

    if (!role1 || !role2) return interaction.editReply({ content: '❌ Verification roles invalid.' });

    const botMember = await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles))
      return interaction.editReply({ content: '⚠️ I need Manage Roles permission.' });

    if (botMember.roles.highest.position <= role1.position || botMember.roles.highest.position <= role2.position)
      return interaction.editReply({ content: '⚠️ My role must be higher than the verification roles.' });

    if (member.roles.cache.has(role1.id) && member.roles.cache.has(role2.id))
      return interaction.editReply({ content: '✅ Already verified!' });

    await member.roles.add([role1, role2], 'Verified user');

    // DM user
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 You are Verified!')
        .setDescription(`Hi ${member.user.username}, you have successfully verified!`)
        .addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: '🎭 Roles Given', value: `${role1} + ${role2}`, inline: true },
          { name: '🧮 Member Count', value: `You are member #${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(0x00FFAA)
        .setTimestamp()
        .setFooter({ text: 'Server Verification' });

      await member.send({ embeds: [dmEmbed] });
    } catch {}

    // Welcome channel embed
    try {
      const welcomeChannel = await guild.channels.fetch(welcomeChannelId);
      if (welcomeChannel) {
        const channelEmbed = new EmbedBuilder()
          .setTitle('🎉 New Member Verified!')
          .setDescription(`${member} has successfully verified!`)
          .addFields(
            { name: '👤 User', value: `${member.user.tag}`, inline: true },
            { name: '🎭 Roles Given', value: `${role1} + ${role2}`, inline: true },
            { name: '🧮 Member Count', value: `Member #${member.guild.memberCount}`, inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setColor(0x00FFAA)
          .setTimestamp()
          .setFooter({ text: 'Verification Complete' });

        await welcomeChannel.send({ embeds: [channelEmbed] });
      }
    } catch {}

    return interaction.editReply({
      content: `🎉 You are now verified and received **${role1.name}** + **${role2.name}**!`
    });
  }

  // ---------------------- Slash Commands ----------------------
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;

    if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      if (amount < 1 || amount > 100)
        return interaction.reply({ content: '⚠️ Amount must be 1-100.', flags: MessageFlags.Ephemeral });

      try {
        const deletedMessages = await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({
          content: `🗑️ Deleted ${deletedMessages.size} message(s).`,
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: '⚠️ Could not delete messages (older than 14 days).',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (commandName === 'resendbanner') {
      if (interaction.user.id !== adminId)
        return interaction.reply({ content: '❌ You are not admin.', flags: MessageFlags.Ephemeral });

      const channel = await client.channels.fetch(verifyChannelId).catch(() => null);
      if (!channel)
        return interaction.reply({ content: '⚠️ Verify channel not found.', flags: MessageFlags.Ephemeral });

      await postVerificationBanner(channel);
      return interaction.reply({ content: '✅ Verification banner reposted!', flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(token);




