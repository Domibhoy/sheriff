require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
if (!TOKEN || !CLIENT_ID) throw new Error('Set DISCORD_TOKEN and CLIENT_ID in .env');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'sheriff.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ guilds: {} }, null, 2));
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
const guildConfig = (id) => {
  db.guilds[id] ??= {
    infractions: {},
    promotions: [],
    channels: {},
    messages: {
      promotion: '🎉 {user} has been promoted to **{role}** after reaching {count} infractions.',
      appeal: '📝 Ban appeal from **{user}**. Reason: {reason}',
    },
  };
  return db.guilds[id];
};
const render = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

const commands = [
  new SlashCommandBuilder().setName('infraction').setDescription('Manage member infractions')
    .addSubcommand(s => s.setName('add').setDescription('Add an infraction').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove one infraction').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand(s => s.setName('view').setDescription('View infractions').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))),
  new SlashCommandBuilder().setName('promotion').setDescription('Configure automatic promotion thresholds')
    .addSubcommand(s => s.setName('add').setDescription('Promote at an infraction count').addIntegerOption(o => o.setName('count').setDescription('Infraction count').setMinValue(1).setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List promotion rules')),
  new SlashCommandBuilder().setName('appeal').setDescription('Submit a ban appeal').addStringOption(o => o.setName('reason').setDescription('Why should the ban be removed?').setRequired(true)),
  new SlashCommandBuilder().setName('config').setDescription('Configure Sheriff')
    .addSubcommand(s => s.setName('channel').setDescription('Set a feature channel').addStringOption(o => o.setName('type').setDescription('Channel purpose').setRequired(true).addChoices({name:'appeals',value:'appeals'},{name:'promotions',value:'promotions'},{name:'logs',value:'logs'})).addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('message').setDescription('Set a custom message template').addStringOption(o => o.setName('type').setDescription('Message type').setRequired(true).addChoices({name:'promotion',value:'promotion'},{name:'appeal',value:'appeal'})).addStringOption(o => o.setName('text').setDescription('Template').setRequired(true))),
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], partials: [Partials.GuildMember] });

async function register() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  if (GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  else await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

function canModerate(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

client.once('ready', () => console.log(`Sheriff online as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cfg = guildConfig(interaction.guildId);
      if (['infraction', 'promotion', 'config'].includes(interaction.commandName) && !canModerate(interaction)) return interaction.reply({ content: 'You need moderation permissions to use this command.', ephemeral: true });

      if (interaction.commandName === 'infraction') {
        const user = interaction.options.getUser('user');
        cfg.infractions[user.id] ??= [];
        const sub = interaction.options.getSubcommand();
        if (sub === 'view') return interaction.reply({ content: `**${user.tag}** has **${cfg.infractions[user.id].length}** infraction(s).\n${cfg.infractions[user.id].map((x,i)=>`${i+1}. ${x.reason} — <t:${Math.floor(x.at/1000)}:R>`).join('\n') || 'None.'}` });
        if (sub === 'remove') {
          cfg.infractions[user.id].pop(); save();
          return interaction.reply({ content: `Removed the latest infraction from ${user}.` });
        }
        const reason = interaction.options.getString('reason');
        cfg.infractions[user.id].push({ reason, at: Date.now(), moderator: interaction.user.id });
        const count = cfg.infractions[user.id].length;
        const member = await interaction.guild.members.fetch(user.id);
        const rules = [...cfg.promotions].sort((a,b) => b.count-a.count);
        const rule = rules.find(r => count >= r.count && !member.roles.cache.has(r.roleId));
        if (rule) {
          const role = interaction.guild.roles.cache.get(rule.roleId);
          if (role && role.position < interaction.guild.members.me.roles.highest.position) {
            await member.roles.add(role, `Automatic promotion at ${count} infractions`);
            const channel = cfg.channels.promotions ? interaction.guild.channels.cache.get(cfg.channels.promotions) : interaction.channel;
            if (channel) await channel.send(render(cfg.messages.promotion, { user: `<@${user.id}>`, role: role.name, count }));
          }
        }
        save();
        return interaction.reply({ content: `Added infraction #${count} to ${user}.` });
      }

      if (interaction.commandName === 'promotion') {
        if (interaction.options.getSubcommand() === 'list') return interaction.reply({ content: cfg.promotions.map(r => `${r.count} infractions → <@&${r.roleId}>`).join('\n') || 'No promotion rules configured.' });
        const count = interaction.options.getInteger('count'); const role = interaction.options.getRole('role');
        cfg.promotions.push({ count, roleId: role.id }); save();
        return interaction.reply({ content: `Promotion rule added: ${count} infractions → ${role}.` });
      }

      if (interaction.commandName === 'config') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'channel') { cfg.channels[interaction.options.getString('type')] = interaction.options.getChannel('channel').id; save(); return interaction.reply({ content: 'Channel configured.' }); }
        cfg.messages[interaction.options.getString('type')] = interaction.options.getString('text'); save();
        return interaction.reply({ content: 'Message template updated. Variables: `{user}`, `{role}`, `{count}`, `{reason}`.' });
      }

      if (interaction.commandName === 'appeal') {
        const reason = interaction.options.getString('reason');
        const channel = cfg.channels.appeals ? interaction.guild.channels.cache.get(cfg.channels.appeals) : interaction.channel;
        const embed = new EmbedBuilder().setTitle('Ban Appeal').setDescription(render(cfg.messages.appeal, { user: `<@${interaction.user.id}>`, reason })).addFields({ name: 'User ID', value: interaction.user.id }, { name: 'Status', value: 'Pending' }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`appeal:approve:${interaction.user.id}`).setLabel('Approve').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`appeal:deny:${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger));
        await channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: 'Your ban appeal has been submitted.', ephemeral: true });
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('appeal:')) {
      if (!canModerate(interaction)) return interaction.reply({ content: 'You need moderation permissions.', ephemeral: true });
      const [, action, userId] = interaction.customId.split(':');
      const status = action === 'approve' ? 'Approved' : 'Denied';
      const embed = EmbedBuilder.from(interaction.message.embeds[0]).spliceFields(1, 1, { name: 'Status', value: `${status} by ${interaction.user}` });
      await interaction.update({ embeds: [embed], components: [] });
      if (action === 'approve') {
        try { await interaction.guild.bans.remove(userId, 'Ban appeal approved'); } catch {}
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable() && !interaction.replied) await interaction.reply({ content: 'Something went wrong. Check the bot console.', ephemeral: true });
  }
});

register().then(() => client.login(TOKEN));
