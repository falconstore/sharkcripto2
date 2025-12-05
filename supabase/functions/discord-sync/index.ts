import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISCORD_API_BASE = 'https://discord.com/api/v10'
const DEFAULT_GUILD_ID = '1343016171892510806'
const DEFAULT_CHANNEL_ID = '1343240456569356432'

interface DiscordMessage {
  id: string
  author: {
    id: string
    username: string
    avatar: string | null
    global_name: string | null
  }
  content: string
  timestamp: string
  mentions: Array<{
    id: string
    username: string
    avatar: string | null
    global_name: string | null
  }>
  reactions?: Array<{
    count: number
    emoji: { name: string }
  }>
}

interface DiscordReaction {
  user_id: string
  user: {
    id: string
    username: string
    avatar: string | null
    global_name: string | null
  }
}

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, { headers })
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5')
      console.log(`Rate limited, waiting ${retryAfter} seconds...`)
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      continue
    }
    
    return response
  }
  throw new Error('Max retries exceeded')
}

async function fetchMessages(channelId: string, botToken: string, limit = 100, before?: string): Promise<DiscordMessage[]> {
  let url = `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=${limit}`
  if (before) {
    url += `&before=${before}`
  }
  
  const response = await fetchWithRetry(url, {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json'
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Discord API error:', response.status, error)
    throw new Error(`Discord API error: ${response.status} - ${error}`)
  }
  
  return response.json()
}

async function fetchReactionUsers(channelId: string, messageId: string, emoji: string, botToken: string): Promise<DiscordReaction[]> {
  const encodedEmoji = encodeURIComponent(emoji)
  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}?limit=100`
  
  const response = await fetchWithRetry(url, {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json'
  })
  
  if (!response.ok) {
    console.error('Failed to fetch reactions:', response.status)
    return []
  }
  
  const users = await response.json()
  return users.map((user: any) => ({ user_id: user.id, user }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')
    if (!botToken) {
      throw new Error('DISCORD_BOT_TOKEN not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let body = {}
    try {
      body = await req.json()
    } catch {
      // Use defaults
    }

    const channelId = (body as any).channelId || DEFAULT_CHANNEL_ID
    const guildId = (body as any).guildId || DEFAULT_GUILD_ID
    const maxMessages = (body as any).maxMessages || 500

    console.log(`Starting sync for channel ${channelId} in guild ${guildId}`)

    // Fetch messages with pagination
    const allMessages: DiscordMessage[] = []
    let lastMessageId: string | undefined
    let fetchCount = 0
    const maxFetches = Math.ceil(maxMessages / 100)

    while (fetchCount < maxFetches) {
      const messages = await fetchMessages(channelId, botToken, 100, lastMessageId)
      
      if (messages.length === 0) break
      
      allMessages.push(...messages)
      lastMessageId = messages[messages.length - 1].id
      fetchCount++
      
      console.log(`Fetched ${allMessages.length} messages so far...`)
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log(`Total messages fetched: ${allMessages.length}`)

    // Process activities
    const activities: Array<{
      discord_user_id: string
      discord_username: string
      discord_avatar: string | null
      channel_id: string
      guild_id: string
      activity_type: string
      message_id: string
      created_at: string
      activity_date: string
    }> = []

    for (const msg of allMessages) {
      const messageDate = new Date(msg.timestamp)
      const activityDate = messageDate.toISOString().split('T')[0]

      // Record message
      activities.push({
        discord_user_id: msg.author.id,
        discord_username: msg.author.global_name || msg.author.username,
        discord_avatar: msg.author.avatar,
        channel_id: channelId,
        guild_id: guildId,
        activity_type: 'message',
        message_id: msg.id,
        created_at: msg.timestamp,
        activity_date: activityDate
      })

      // Record mentions
      for (const mention of msg.mentions) {
        activities.push({
          discord_user_id: mention.id,
          discord_username: mention.global_name || mention.username,
          discord_avatar: mention.avatar,
          channel_id: channelId,
          guild_id: guildId,
          activity_type: 'mention',
          message_id: msg.id,
          created_at: msg.timestamp,
          activity_date: activityDate
        })
      }

      // Fetch reaction users for each reaction
      if (msg.reactions && msg.reactions.length > 0) {
        for (const reaction of msg.reactions) {
          try {
            const reactionUsers = await fetchReactionUsers(channelId, msg.id, reaction.emoji.name, botToken)
            
            for (const ru of reactionUsers) {
              activities.push({
                discord_user_id: ru.user.id,
                discord_username: ru.user.global_name || ru.user.username,
                discord_avatar: ru.user.avatar,
                channel_id: channelId,
                guild_id: guildId,
                activity_type: 'reaction',
                message_id: msg.id,
                created_at: msg.timestamp,
                activity_date: activityDate
              })
            }
            
            // Small delay between reaction fetches
            await new Promise(resolve => setTimeout(resolve, 200))
          } catch (e) {
            console.error(`Failed to fetch reactions for message ${msg.id}:`, e)
          }
        }
      }
    }

    console.log(`Total activities to insert: ${activities.length}`)

    // Delete old activities for this channel
    const { error: deleteError } = await supabase
      .from('discord_channel_activity')
      .delete()
      .eq('channel_id', channelId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
    }

    // Insert new activities in batches
    const batchSize = 500
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('discord_channel_activity')
        .insert(batch)

      if (insertError) {
        console.error(`Insert error for batch ${i}:`, insertError)
      }
    }

    // Update sync config
    const { error: updateError } = await supabase
      .from('discord_sync_config')
      .upsert({
        guild_id: guildId,
        channel_id: channelId,
        last_sync_at: new Date().toISOString(),
        last_message_id: allMessages[0]?.id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'guild_id,channel_id'
      })

    if (updateError) {
      console.error('Update config error:', updateError)
    }

    // Calculate stats
    const messageCount = activities.filter(a => a.activity_type === 'message').length
    const reactionCount = activities.filter(a => a.activity_type === 'reaction').length
    const mentionCount = activities.filter(a => a.activity_type === 'mention').length
    const uniqueUsers = new Set(activities.map(a => a.discord_user_id)).size

    const stats = {
      messagesProcessed: allMessages.length,
      activitiesRecorded: activities.length,
      messageActivities: messageCount,
      reactionActivities: reactionCount,
      mentionActivities: mentionCount,
      uniqueUsers,
      syncedAt: new Date().toISOString()
    }

    console.log('Sync completed:', stats)

    return new Response(JSON.stringify({
      success: true,
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
