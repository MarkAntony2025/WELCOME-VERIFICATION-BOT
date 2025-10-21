🎉 Discord Verification Bot with Express

A full-featured Discord bot built with Discord.js v15 and Express, including:

Verification system with button roles

Auto-role for new members

Welcome messages in a dedicated welcome channel

DM verification confirmation with dynamic member count

/clear command accessible to all users (safe deletion)

/resendbanner command for admin only

Express server for uptime monitoring and status page

🛠 Features

Verification Button: Users click the "Verify" button to get assigned roles.

Auto Role: Automatically assigns a role to new members on join.

Welcome Messages:

Channel welcome embed

DM to verified users with member count (You are member #1234)

Slash Commands:

/clear [amount]: Delete a number of messages (1-100) — accessible to all users

/resendbanner: Repost the verification banner — admin only

Express Server:

/ → Simple alive message

/status → JSON with bot and server statistics

⚡ Requirements

Node.js v18+

Discord.js v15+

Discord bot token and a server to deploy

📁 Setup
1. Clone Repository
git clone https://github.com/yourusername/discord-verify-bot.git
cd discord-verify-bot

2. Install Dependencies
npm install

3. Configure .env File

Create a .env file in the root directory:

BOT_TOKEN=YOUR_BOT_TOKEN
GUILD_ID=YOUR_GUILD_ID
VERIFY_CHANNEL_ID=VERIFY_CHANNEL_ID
ROLE_1_ID=ROLE_1_ID
ROLE_2_ID=ROLE_2_ID
AUTO_ROLE_ID=AUTO_ROLE_ID_FOR_NEW_USERS
ADMIN_ID=YOUR_DISCORD_USER_ID
WELCOME_CHANNEL_ID=WELCOME_CHANNEL_ID
BANNER_URL=https://example.com/banner.png
PORT=3000


Replace the placeholders with your server and bot information.

PORT is optional (default 3000).

4. Run the Bot
node index.js

🌐 Express Endpoints

/ → Returns a simple "Bot is running!" message

/status → Returns JSON with bot username, server count, and total members

Example:

{
  "status": "online",
  "bot": "MyBot#1234",
  "guilds": 1,
  "members": 1234
}

💡 Permissions

Bot requires:

Manage Roles → For assigning verification roles

Send Messages → For welcome messages

Embed Links → For rich embeds

Users: /clear works for anyone (Discord limitation: only messages < 14 days old)

📝 Notes

bulkDelete Limitations: Messages older than 14 days cannot be deleted by Discord API.

Ensure your bot’s role is higher than the verification roles in server hierarchy.

Use an uptime monitor (e.g., UptimeRobot) to ping your Express / endpoint to keep the bot alive.

📌 License

MIT License ©
