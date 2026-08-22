# Sheriff

Discord moderation bot for infractions, automatic role promotions, ban appeals, and configurable messages/channels.

## Features
- `/infraction add|remove|view`
- Automatic role promotion when an infraction threshold is reached
- `/promotion add|list`
- `/appeal` with moderator Approve/Deny buttons
- `/config channel` for appeals, promotions, and logs channels
- `/config message` for promotion and appeal templates
- Persistent JSON data in `data/sheriff.json`

## Setup
1. Install Node.js 20+.
2. Create a Discord application/bot and enable the **Server Members Intent**.
3. Copy `.env.example` to `.env` and set `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`.
4. Run `npm install` then `npm start`.
5. Give the bot `Manage Roles` and the required moderation permissions. The bot's highest role must be above roles it needs to assign.

For production, use a real database instead of the included JSON store if you expect multiple bot instances or high traffic.
