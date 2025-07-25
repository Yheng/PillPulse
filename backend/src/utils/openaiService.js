import OpenAI from 'openai'
import { queryOne, query as queryAll } from '../models/database.js'
import { decryptApiKey } from './encryption.js'

/**
 * OpenAI Service for PillPulse
 * Provides AI-powered medication reminders, insights, and personalized coaching
 * Uses user's stored API key to generate personalized content
 */

/**
 * Get OpenAI client instance for a user
 * @param {number} userId - User ID to get API key for
 * @returns {Promise<OpenAI|null>} OpenAI client instance or null if no API key
 */
async function getOpenAIClient(userId) {
  try {
    const user = await queryOne('SELECT api_key FROM users WHERE id = ?', [userId])
    
    if (!user || !user.api_key) {
      console.log(`⚠️ No OpenAI API key found for user ${userId}`)
      return null
    }
    
    const apiKey = decryptApiKey(user.api_key)
    return new OpenAI({ apiKey })
  } catch (error) {
    console.error('❌ Error creating OpenAI client:', error.message)
    return null
  }
}

/**
 * Get user's medication context for AI prompts
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User medication context
 */
async function getUserMedicationContext(userId) {
  try {
    // Get user's current schedules
    const schedules = await queryAll(`
      SELECT s.*, COUNT(ar.id) as total_doses, 
             SUM(CASE WHEN ar.taken THEN 1 ELSE 0 END) as taken_doses
      FROM schedules s
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id 
        AND ar.date >= date('now', '-30 days')
      WHERE s.user_id = ?
      GROUP BY s.id
    `, [userId])

    // Get recent adherence patterns
    const recentAdherence = await queryAll(`
      SELECT ar.*, s.medication_name, s.time
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE s.user_id = ? AND ar.date >= date('now', '-7 days')
      ORDER BY ar.date DESC, s.time
    `, [userId])

    // Calculate overall adherence rate
    const totalDoses = recentAdherence.length
    const takenDoses = recentAdherence.filter(record => record.taken).length
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0

    return {
      schedules,
      recentAdherence,
      adherenceRate,
      totalMedications: schedules.length,
      hasMissedDoses: recentAdherence.some(record => !record.taken)
    }
  } catch (error) {
    console.error('❌ Error getting user medication context:', error.message)
    return { schedules: [], recentAdherence: [], adherenceRate: 0, totalMedications: 0, hasMissedDoses: false }
  }
}

/**
 * Generate personalized medication reminder
 * @param {number} userId - User ID
 * @param {Object} schedule - Medication schedule
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Personalized reminder message
 */
export async function generatePersonalizedReminder(userId, schedule, options = {}) {
  const openai = await getOpenAIClient(userId)
  if (!openai) {
    // Fallback to basic reminder
    return `⏰ Time to take your ${schedule.medication_name} (${schedule.dosage})`
  }

  try {
    const context = await getUserMedicationContext(userId)
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })

    const prompt = `You are a helpful, caring medication reminder assistant for PillPulse. Generate a personalized, encouraging reminder message.

User Context:
- Current medication: ${schedule.medication_name} (${schedule.dosage})
- Scheduled time: ${schedule.time}
- Current time: ${currentTime}
- Overall adherence rate: ${context.adherenceRate}%
- Total medications: ${context.totalMedications}
- Has missed recent doses: ${context.hasMissedDoses}
- Frequency: ${schedule.frequency}

${options.isMissed ? '- This is a MISSED DOSE reminder' : ''}
${options.isEarly ? '- User is taking medication early' : ''}

Guidelines:
- Keep it friendly, encouraging, and concise (2-3 sentences max)
- Use appropriate emoji (💊, ⏰, 💪, 🌟, etc.)
- If adherence is good (80%+), be congratulatory
- If adherence is poor (<80%), be more motivational
- For missed doses, be gentle but emphasize importance
- Include the medication name and dosage
- Make it personal and caring, not clinical

Generate a personalized reminder message:`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.7
    })

    const aiReminder = completion.choices[0]?.message?.content?.trim()
    
    if (aiReminder) {
      console.log(`✅ Generated AI reminder for user ${userId}`)
      return aiReminder
    } else {
      throw new Error('Empty AI response')
    }
  } catch (error) {
    console.error('❌ Error generating AI reminder:', error.message)
    // Fallback to basic reminder
    return `💊 Time for your ${schedule.medication_name} (${schedule.dosage})! Keep up the great work with your medication routine.`
  }
}

/**
 * Generate AI-powered insights based on user's medication history
 * @param {number} userId - User ID
 * @returns {Promise<Object>} AI-generated insights
 */
export async function generateAIInsights(userId) {
  const openai = await getOpenAIClient(userId)
  if (!openai) {
    return { insights: [], recommendations: [], patterns: [] }
  }

  try {
    const context = await getUserMedicationContext(userId)
    
    // Get more detailed adherence data
    const adherenceData = await queryAll(`
      SELECT 
        s.medication_name,
        s.time,
        s.frequency,
        ar.date,
        ar.taken,
        ar.actual_time,
        ar.notes,
        strftime('%w', ar.date) as day_of_week,
        strftime('%H', ar.actual_time) as hour_taken
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE s.user_id = ? AND ar.date >= date('now', '-30 days')
      ORDER BY ar.date DESC
    `, [userId])

    if (adherenceData.length === 0) {
      return {
        insights: ['Start taking your medications to get personalized AI insights!'],
        recommendations: ['Log your medication adherence regularly for better insights'],
        patterns: []
      }
    }

    const prompt = `You are an AI medication adherence analyst for PillPulse. Analyze the user's medication data and provide insights.

User Medication Data:
- Overall adherence rate: ${context.adherenceRate}%
- Total medications: ${context.totalMedications}
- Recent adherence records (last 30 days): ${adherenceData.length} records

Medications:
${context.schedules.map(s => `- ${s.medication_name} (${s.dosage}) at ${s.time}, ${s.frequency}`).join('\n')}

Recent Adherence Patterns:
${adherenceData.slice(0, 10).map(a => `- ${a.medication_name}: ${a.taken ? 'TAKEN' : 'MISSED'} on ${a.date}${a.actual_time ? ` at ${a.actual_time}` : ''}${a.notes ? ` (${a.notes})` : ''}`).join('\n')}

Analyze this data and provide:
1. Performance insights (2-3 key observations about their adherence)
2. Personalized recommendations (2-3 actionable suggestions)
3. Pattern observations (1-2 patterns you notice)

Format as JSON:
{
  "performance_insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "patterns": ["pattern1", "pattern2"]
}

Focus on being helpful, encouraging, and specific. Mention specific medications and times when relevant.`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.6
    })

    const aiResponse = completion.choices[0]?.message?.content?.trim()
    
    if (aiResponse) {
      try {
        const insights = JSON.parse(aiResponse)
        console.log(`✅ Generated AI insights for user ${userId}`)
        return {
          insights: insights.performance_insights || [],
          recommendations: insights.recommendations || [],
          patterns: insights.patterns || []
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI insights JSON:', parseError.message)
        return {
          insights: [aiResponse.slice(0, 200) + '...'],
          recommendations: ['Continue logging your medications for better insights'],
          patterns: []
        }
      }
    } else {
      throw new Error('Empty AI response')
    }
  } catch (error) {
    console.error('❌ Error generating AI insights:', error.message)
    return {
      insights: ['Unable to generate AI insights at this time'],
      recommendations: ['Keep logging your medications consistently'],
      patterns: []
    }
  }
}

/**
 * Generate personalized medication coaching message
 * @param {number} userId - User ID
 * @param {string} coachingType - Type of coaching (motivation, missed_dose, timing, etc.)
 * @param {Object} context - Additional context
 * @returns {Promise<string>} Coaching message
 */
export async function generateCoachingMessage(userId, coachingType, context = {}) {
  const openai = await getOpenAIClient(userId)
  if (!openai) {
    const fallbackMessages = {
      motivation: "💪 You're doing great with your medication routine! Every dose counts towards your health goals.",
      missed_dose: "Don't worry about missing a dose - just take it now if it's not too late, and get back on track!",
      timing: "⏰ Try to take your medications at consistent times each day for the best results.",
      streak: "🌟 Amazing medication streak! Your consistency is paying off.",
      improvement: "📈 Your adherence has improved! Keep up the excellent work."
    }
    return fallbackMessages[coachingType] || fallbackMessages.motivation
  }

  try {
    const userContext = await getUserMedicationContext(userId)
    
    const prompts = {
      motivation: `Generate an encouraging, personalized message to motivate a user with ${userContext.adherenceRate}% adherence rate taking ${userContext.totalMedications} medications.`,
      missed_dose: `Generate a gentle, supportive message for a user who missed taking ${context.medicationName}. Help them get back on track without guilt.`,
      timing: `Generate advice for a user about taking medications at consistent times. Their current adherence rate is ${userContext.adherenceRate}%.`,
      streak: `Congratulate a user who has taken their medications consistently for ${context.streakDays} days. Their medications: ${userContext.schedules.map(s => s.medication_name).join(', ')}.`,
      improvement: `Celebrate a user whose adherence improved from ${context.previousRate}% to ${userContext.adherenceRate}%. Encourage them to keep going.`
    }

    const basePrompt = prompts[coachingType] || prompts.motivation
    const fullPrompt = `You are a caring medication adherence coach for PillPulse. ${basePrompt}

Guidelines:
- Be warm, encouraging, and personal
- Keep it concise (2-3 sentences)
- Use appropriate emojis
- Focus on health benefits and positive reinforcement
- Avoid being preachy or clinical

Generate a coaching message:`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: fullPrompt }],
      max_tokens: 120,
      temperature: 0.8
    })

    const aiMessage = completion.choices[0]?.message?.content?.trim()
    
    if (aiMessage) {
      console.log(`✅ Generated AI coaching message for user ${userId}`)
      return aiMessage
    } else {
      throw new Error('Empty AI response')
    }
  } catch (error) {
    console.error('❌ Error generating AI coaching message:', error.message)
    return "💪 Keep up the great work with your medications! Your health journey matters."
  }
}

/**
 * Generate medication education content
 * @param {string} medicationName - Name of medication
 * @param {string} educationType - Type of education (benefits, side_effects, timing, etc.)
 * @returns {Promise<string>} Educational content
 */
export async function generateMedicationEducation(medicationName, educationType = 'general') {
  // This function doesn't require user API key - uses system-level education
  const prompt = `Provide brief, helpful education about ${medicationName} for patients.

Focus on: ${educationType}

Guidelines:
- Keep it simple and patient-friendly
- 2-3 key points maximum
- Emphasize the importance of adherence
- Include relevant emojis
- Be encouraging and supportive

Generate educational content:`

  try {
    // For education, we could use a system-wide API key or provide general guidance
    // For now, return helpful general information
    const educationContent = {
      general: `💊 ${medicationName} is important for your health. Take it exactly as prescribed and at the same time each day for best results.`,
      timing: `⏰ For ${medicationName}, timing matters! Try to take it at the same time daily to maintain consistent levels in your system.`,
      benefits: `🌟 ${medicationName} helps improve your health when taken consistently. Don't skip doses - your body depends on regular medication levels.`,
      side_effects: `⚠️ If you experience any unusual symptoms with ${medicationName}, contact your healthcare provider. Don't stop taking it without medical advice.`
    }

    return educationContent[educationType] || educationContent.general
  } catch (error) {
    console.error('❌ Error generating medication education:', error.message)
    return `Take your ${medicationName} as prescribed by your healthcare provider.`
  }
}

/**
 * Check if user has OpenAI API key configured
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user has API key
 */
export async function hasOpenAIKey(userId) {
  try {
    const user = await queryOne('SELECT api_key FROM users WHERE id = ?', [userId])
    return !!(user && user.api_key)
  } catch (error) {
    console.error('❌ Error checking OpenAI key:', error.message)
    return false
  }
}

export default {
  generatePersonalizedReminder,
  generateAIInsights,
  generateCoachingMessage,
  generateMedicationEducation,
  hasOpenAIKey
}