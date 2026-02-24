import { config } from 'dotenv';
import { Client } from 'discord.js-selfbot-v13';

config();

const TOKEN = process.env.DISCORD_USER_TOKEN;

async function main() {
  const client = new Client();
  
  client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    
    try {
      const username = 'reedtrullz';
      let user = client.users.cache.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        console.log(`User ${username} not found in cache, searching...`);
        try {
          user = await client.users.fetch(username);
        } catch (e) {
          console.error('Could not find user:', e);
          client.destroy();
          process.exit(1);
        }
      }
      
      if (user) {
        console.log(`Found user: ${user.tag} (${user.id})`);

        const dmChannel = await user.createDM();
        console.log(`Created DM channel: ${dmChannel.id}`);

        await dmChannel.send({
          content: '🎉 Her er en glad hummer! (Bildegenereringstest)',
          files: ['/tmp/happy_lobster.png']
        });
        
        console.log('Image sent successfully!');
      } else {
        console.error('User not found');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    
    client.destroy();
    process.exit(0);
  });
  
  client.on('error', (err) => {
    console.error('Client error:', err);
    process.exit(1);
  });
  
  console.log('Logging in...');
  await client.login(TOKEN);
}

main().catch(console.error);
