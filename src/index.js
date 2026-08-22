require('dotenv').config();
const fs=require('node:fs'),path=require('node:path');
const {Client,GatewayIntentBits,Partials,PermissionFlagsBits,SlashCommandBuilder,REST,Routes,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType}=require('discord.js');
const TOKEN=process.env.DISCORD_TOKEN,CLIENT_ID=process.env.CLIENT_ID,GUILD_ID=process.env.GUILD_ID;
if(!TOKEN||!CLIENT_ID)throw new Error('Set DISCORD_TOKEN and CLIENT_ID in .env');
const DATA_DIR=path.join(__dirname,'..','data'),DATA_FILE=path.join(DATA_DIR,'sheriff.json');fs.mkdirSync(DATA_DIR,{recursive:true});if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,JSON.stringify({guilds:{}},null,2));const db=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')),save=()=>fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2));
const RECRUITMENT_CHANNEL='1533841394643238973';
const RECRUITMENT=`🚔 **WASHINGTON SHERIFF’S OFFICE | RECRUITMENT APPLICATIONS NOW OPEN** 🚔

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Are you ready to take the next step and become a member of the Washington Sheriff’s Office?**

The **Washington Sheriff’s Office** is officially accepting applications from individuals who are motivated, mature, professional, and willing to dedicate their time to serving and protecting our community.

We are looking for members who can demonstrate **leadership, professionalism, communication, teamwork, responsibility, and integrity** both in and out of roleplay.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **APPLICATION REQUIREMENTS**

Before submitting your application, please ensure that you:

> 🔹 Answer **every question** honestly and thoroughly.
>
> 🔹 Provide detailed responses rather than one-word or short answers.
>
> 🔹 Demonstrate professionalism throughout your application.
>
> 🔹 Use proper **spelling, punctuation, grammar, and capitalization (SPaG)**.
>
> 🔹 Have a genuine interest in law enforcement roleplay and serving the community.
>
> 🔹 Understand that your application may be reviewed by multiple members of Sheriff’s Office leadership.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **IMPORTANT INFORMATION**

Applications that are **low-effort, rushed, incomplete, copied, troll-related, or intentionally misleading** may be denied without further consideration.

Submitting an application does **not** guarantee acceptance into the Washington Sheriff’s Office. Every application will be reviewed based on the applicant's responses, maturity, professionalism, experience, activity, and overall suitability for the position.

🚨 **Please take your time when completing your application.**

A well-written and detailed application gives leadership a much better understanding of who you are and what you can bring to the department.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👮 **WHAT WE LOOK FOR**

Our ideal applicants demonstrate:

> 🛡️ **Integrity** — Always doing the right thing, even when nobody is watching.
>
> 🤝 **Teamwork** — Working effectively alongside other members and departments.
>
> 🗣️ **Communication** — Communicating clearly and professionally.
>
> 🎯 **Discipline** — Following department procedures and leadership instructions.
>
> ⭐ **Professionalism** — Representing the Sheriff's Office appropriately.
>
> 📚 **Willingness to Learn** — Being open to training, feedback, and improvement.
>
> 🚔 **Commitment** — Being willing to actively participate and contribute to the department.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 **BEFORE YOU APPLY**

Please make sure you have enough time to complete the application properly. **Do not rush your responses.**

Leadership may contact you regarding your application if additional information or clarification is required.

📌 **Reminder:** Using AI, copying another applicant's answers, or intentionally providing false information may result in your application being denied.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎖️ **READY TO JOIN?**

If you believe you have what it takes to represent the **Washington Sheriff's Office**, demonstrate your commitment, and become part of our team, we encourage you to apply.

**Good luck to everyone applying!**

**We look forward to reviewing your applications.** 👮‍♂️🚔

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 **APPLICATION PORTAL**

To begin your application, please click the link below:

👉 [**CLICK HERE TO APPLY**](https://melon.ly/form/7489761750036779008)

**Washington Sheriff's Office**

*Serve • Protect • Professionalism • Integrity* 🚔`;
const guildConfig=id=>{db.guilds[id]??={infractions:{},promotions:[],channels:{},messages:{promotion:'🎉 {user} has been promoted to **{role}** after reaching {count} infractions.',appeal:'📝 Ban appeal from **{user}**. Reason: {reason}'}};return db.guilds[id]};
const render=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??`{${k}}`),infractionId=()=>`SI-${Math.floor(1000+Math.random()*9000)}`;
const commands=[new SlashCommandBuilder().setName('infraction').setDescription('Manage member infractions').addSubcommand(s=>s.setName('add').setDescription('Add an infraction').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true))).addSubcommand(s=>s.setName('remove').setDescription('Remove one infraction').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))).addSubcommand(s=>s.setName('view').setDescription('View infractions').addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))),new SlashCommandBuilder().setName('promotion').setDescription('Configure automatic promotion thresholds').addSubcommand(s=>s.setName('add').setDescription('Promote at an infraction count').addIntegerOption(o=>o.setName('count').setDescription('Infraction count').setMinValue(1).setRequired(true)).addRoleOption(o=>o.setName('role').setDescription('Role to add').setRequired(true))).addSubcommand(s=>s.setName('list').setDescription('List promotion rules')),new SlashCommandBuilder().setName('appeal').setDescription('Submit a ban appeal').addStringOption(o=>o.setName('reason').setDescription('Why should the ban be removed?').setRequired(true)),new SlashCommandBuilder().setName('config').setDescription('Configure Sheriff').addSubcommand(s=>s.setName('channel').setDescription('Set a feature channel').addStringOption(o=>o.setName('type').setDescription('Channel purpose').setRequired(true).addChoices({name:'appeals',value:'appeals'},{name:'promotions',value:'promotions'},{name:'logs',value:'logs'})).addChannelOption(o=>o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))).addSubcommand(s=>s.setName('message').setDescription('Set a custom message template').addStringOption(o=>o.setName('type').setDescription('Message type').setRequired(true).addChoices({name:'promotion',value:'promotion'},{name:'appeal',value:'appeal'})).addStringOption(o=>o.setName('text').setDescription('Template').setRequired(true)))].map(c=>c.toJSON());
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],partials:[Partials.GuildMember]});
async function register(){const rest=new REST({version:'10'}).setToken(TOKEN);if(GUILD_ID)await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});else await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands})}function canModerate(i){return i.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)||i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)}
client.once('ready',async()=>{console.log(`Sheriff online as ${client.user.tag}`);for(const g of client.guilds.cache.values()){const ch=g.channels.cache.get(RECRUITMENT_CHANNEL);if(ch?.isTextBased()){const msgs=await ch.messages.fetch({limit:10});if(!msgs.some(m=>m.author.id===client.user.id&&m.content.includes('WASHINGTON SHERIFF’S OFFICE | RECRUITMENT APPLICATIONS NOW OPEN')))await ch.send({content:RECRUITMENT,allowedMentions:{parse:[]}})}}});
client.on('interactionCreate',async i=>{try{if(!i.isChatInputCommand())return;const cfg=guildConfig(i.guildId);if(['infraction','promotion','config'].includes(i.commandName)&&!canModerate(i))return i.reply({content:'You need moderation permissions to use this command.',ephemeral:true});if(i.commandName==='infraction'){const u=i.options.getUser('user');cfg.infractions[u.id]??=[];const sub=i.options.getSubcommand();if(sub==='view')return i.reply({content:`**${u.tag}** has **${cfg.infractions[u.id].length}** infraction(s).`});if(sub==='remove'){cfg.infractions[u.id].pop();save();return i.reply({content:`Removed the latest infraction from ${u}.`})}const reason=i.options.getString('reason'),id=infractionId();cfg.infractions[u.id].push({reason,at:Date.now(),moderator:i.user.id,id});const count=cfg.infractions[u.id].length,m=await i.guild.members.fetch(u.id),rule=[...cfg.promotions].sort((a,b)=>b.count-a.count).find(r=>count>=r.count&&!m.roles.cache.has(r.roleId));if(rule){const role=i.guild.roles.cache.get(rule.roleId);if(role&&role.position<i.guild.members.me.roles.highest.position)await m.roles.add(role,`Automatic promotion at ${count} infractions`)}save();return i.reply({embeds:[new EmbedBuilder().setColor(0xF2C94C).setTitle('Infraction').setDescription(`An infraction has been issued to <@${u.id}>.`).addFields({name:'Reason',value:reason},{name:'Issued By',value:`<@${i.user.id}>`}).setFooter({text:id})}]})}if(i.commandName==='promotion'){if(i.options.getSubcommand()==='list')return i.reply({content:cfg.promotions.map(r=>`${r.count} infractions → <@&${r.roleId}>`).join('\n')||'No promotion rules configured.'});const count=i.options.getInteger('count'),role=i.options.getRole('role');cfg.promotions.push({count,roleId:role.id});save();return i.reply({content:`Promotion rule added: ${count} infractions → ${role}.`})}if(i.commandName==='config'){const sub=i.options.getSubcommand();if(sub==='channel'){cfg.channels[i.options.getString('type')]=i.options.getChannel('channel').id;save();return i.reply({content:'Channel configured.'})}cfg.messages[i.options.getString('type')]=i.options.getString('text');save();return i.reply({content:'Message template updated.'})}if(i.commandName==='appeal'){const reason=i.options.getString('reason'),ch=cfg.channels.appeals?i.guild.channels.cache.get(cfg.channels.appeals):i.channel,row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`appeal:approve:${i.user.id}`).setLabel('Approve').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`appeal:deny:${i.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger));await ch.send({embeds:[new EmbedBuilder().setTitle('Ban Appeal').setDescription(render(cfg.messages.appeal,{user:`<@${i.user.id}>`,reason})).addFields({name:'User ID',value:i.user.id},{name:'Status',value:'Pending'})],components:[row]});return i.reply({content:'Your ban appeal has been submitted.',ephemeral:true})}}catch(e){console.error(e);if(i.isRepliable()&&!i.replied)await i.reply({content:'Something went wrong.',ephemeral:true})}});register().then(()=>client.login(TOKEN));
