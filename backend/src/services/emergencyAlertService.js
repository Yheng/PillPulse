import { query, queryOne } from '../models/database.js'
import nodemailer from 'nodemailer'

/**
 * Emergency Alert Service
 * Handles emergency notifications for missed critical medications
 * Sends alerts to emergency contacts when patients miss important doses
 */

class EmergencyAlertService {
  constructor() {
    this.alertThresholds = {
      // Number of consecutive missed doses before triggering emergency alert
      consecutive_missed: 2,
      // Hours after scheduled time before considering dose "critically missed"
      critical_missed_hours: 4,
      // Maximum alerts per day per contact to prevent spam
      max_alerts_per_day: 3
    }
  }

  /**
   * Check for missed critical doses and send emergency alerts
   * Called periodically by the notification service
   */
  async checkForEmergencyAlerts() {
    try {
      console.log('🚨 Checking for emergency alerts...')
      
      // Get all missed doses from the last 24 hours
      const missedDoses = await this.getMissedCriticalDoses()
      
      for (const missedDose of missedDoses) {
        await this.processEmergencyAlert(missedDose)
      }
      
      console.log(`✅ Emergency alert check completed. Processed ${missedDoses.length} potential alerts`)
    } catch (error) {
      console.error('❌ Error checking emergency alerts:', error)
    }
  }

  /**
   * Get missed critical doses that require emergency alerts
   */
  async getMissedCriticalDoses() {
    const criticalCutoff = new Date()
    criticalCutoff.setHours(criticalCutoff.getHours() - this.alertThresholds.critical_missed_hours)
    
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Find schedules with missed doses that are critically overdue
    const missedDoses = await query(`
      SELECT 
        s.id as schedule_id,
        s.user_id,
        s.medication_name,
        s.dosage,
        s.time,
        s.frequency,
        u.email as patient_email,
        COALESCE(ar.taken, 0) as taken,
        CASE 
          WHEN ar.date IS NULL THEN 0
          ELSE 1 
        END as has_record
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id 
        AND ar.date = ?
      WHERE s.frequency = 'daily'
        AND (ar.taken = 0 OR ar.taken IS NULL)
        AND datetime('now') > datetime(? || ' ' || s.time || ':00', '+' || ? || ' hours')
    `, [today, today, this.alertThresholds.critical_missed_hours])

    // Filter for patients who have consecutive missed doses
    const criticalMissedDoses = []
    
    for (const dose of missedDoses) {
      const consecutiveMissed = await this.getConsecutiveMissedCount(dose.schedule_id, dose.user_id)
      
      if (consecutiveMissed >= this.alertThresholds.consecutive_missed) {
        criticalMissedDoses.push({
          ...dose,
          consecutive_missed: consecutiveMissed
        })
      }
    }

    return criticalMissedDoses
  }

  /**
   * Get count of consecutive missed doses for a schedule
   */
  async getConsecutiveMissedCount(scheduleId, userId) {
    // Get last 7 days of adherence records for this schedule
    const records = await query(`
      SELECT date, taken
      FROM adherence_records 
      WHERE schedule_id = ?
        AND date >= date('now', '-7 days')
      ORDER BY date DESC
    `, [scheduleId])

    let consecutiveMissed = 0
    const today = new Date().toISOString().split('T')[0]
    let checkDate = new Date()

    // Count backwards from today until we find a taken dose
    for (let i = 0; i < 7; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const record = records.find(r => r.date === dateStr)
      
      if (record && record.taken) {
        break
      } else if (record && !record.taken) {
        consecutiveMissed++
      } else if (dateStr <= today) {
        // No record means missed (for dates <= today)
        consecutiveMissed++
      }
      
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return consecutiveMissed
  }

  /**
   * Process emergency alert for a specific missed dose
   */
  async processEmergencyAlert(missedDose) {
    try {
      // Get emergency contacts for this patient
      const emergencyContacts = await query(`
        SELECT * FROM emergency_contacts
        WHERE user_id = ? AND notify_missed_doses = 1
        ORDER BY priority ASC
      `, [missedDose.user_id])

      if (emergencyContacts.length === 0) {
        console.log(`⚠️ No emergency contacts found for user ${missedDose.patient_email}`)
        return
      }

      // Check if we've already sent alerts for this dose today
      const today = new Date().toISOString().split('T')[0]
      const existingAlerts = await query(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? 
          AND schedule_id = ?
          AND type = 'missed_dose'
          AND DATE(sent_at) = ?
      `, [missedDose.user_id, missedDose.schedule_id, today])

      if (existingAlerts[0]?.count >= this.alertThresholds.max_alerts_per_day) {
        console.log(`⚠️ Already sent maximum alerts for ${missedDose.medication_name} today`)
        return
      }

      // Send alerts to emergency contacts
      for (const contact of emergencyContacts.slice(0, 3)) { // Limit to top 3 contacts
        await this.sendEmergencyAlert(missedDose, contact)
      }

      // Log the emergency alert
      await this.logEmergencyAlert(missedDose)
      
    } catch (error) {
      console.error('❌ Error processing emergency alert:', error)
    }
  }

  /**
   * Send emergency alert to a specific contact
   */
  async sendEmergencyAlert(missedDose, contact) {
    try {
      const alertMessage = this.generateAlertMessage(missedDose, contact)
      
      // Send email if contact has email
      if (contact.email) {
        await this.sendEmailAlert(contact.email, alertMessage, missedDose)
      }

      // Send SMS if contact has phone (would need SMS service integration)
      if (contact.phone) {
        await this.sendSMSAlert(contact.phone, alertMessage, missedDose)
      }

      console.log(`📧 Emergency alert sent to ${contact.name} (${contact.email || contact.phone})`)
      
    } catch (error) {
      console.error(`❌ Failed to send emergency alert to ${contact.name}:`, error)
    }
  }

  /**
   * Generate emergency alert message
   */
  generateAlertMessage(missedDose, contact) {
    return {
      subject: `🚨 URGENT: ${missedDose.patient_email} missed critical medication`,
      body: `
Dear ${contact.name},

This is an emergency alert regarding ${missedDose.patient_email}'s medication adherence.

MISSED MEDICATION DETAILS:
• Medication: ${missedDose.medication_name}
• Dosage: ${missedDose.dosage}
• Scheduled Time: ${this.formatTime(missedDose.time)}
• Consecutive Missed Doses: ${missedDose.consecutive_missed}
• Patient: ${missedDose.patient_email}

This medication was scheduled for ${this.formatTime(missedDose.time)} and has not been taken. 
Multiple consecutive doses have been missed, which may pose a health risk.

RECOMMENDED ACTIONS:
1. Contact ${missedDose.patient_email} immediately
2. Ensure they take the missed medication if safe to do so
3. Check on their overall well-being
4. Consider contacting their healthcare provider if needed

If this is a medical emergency, please call 911 immediately.

This alert was generated because you are listed as an emergency contact with priority ${contact.priority}.

---
PillPulse Emergency Alert System
Generated at: ${new Date().toLocaleString()}
      `.trim()
    }
  }

  /**
   * Send email alert using nodemailer
   */
  async sendEmailAlert(email, alertMessage, missedDose) {
    try {
      // Configure email transporter (would need proper SMTP setup)
      const transporter = nodemailer.createTransporter({
        // Configure with your email service
        service: 'gmail',
        auth: {
          user: process.env.ALERT_EMAIL_USER,
          pass: process.env.ALERT_EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.ALERT_EMAIL_USER,
        to: email,
        subject: alertMessage.subject,
        text: alertMessage.body,
        html: this.generateEmailHTML(alertMessage, missedDose)
      };

      // Only send if email credentials are configured
      if (process.env.ALERT_EMAIL_USER && process.env.ALERT_EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Emergency email sent to ${email}`);
      } else {
        console.log(`⚠️ Email alert would be sent to ${email} (email not configured)`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send email alert:', error);
    }
  }

  /**
   * Send SMS alert (placeholder - would need SMS service integration)
   */
  async sendSMSAlert(phone, alertMessage, missedDose) {
    try {
      // This would integrate with SMS service like Twilio
      const smsMessage = `🚨 URGENT: ${missedDose.patient_email} missed ${missedDose.medication_name} (${missedDose.dosage}). ${missedDose.consecutive_missed} consecutive missed doses. Please check on them immediately.`;
      
      console.log(`📱 SMS alert would be sent to ${phone}: ${smsMessage.substring(0, 100)}...`);
      
      // TODO: Integrate with SMS service
      // await smsService.send(phone, smsMessage);
      
    } catch (error) {
      console.error('❌ Failed to send SMS alert:', error);
    }
  }

  /**
   * Generate HTML email template
   */
  generateEmailHTML(alertMessage, missedDose) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-left: 4px solid #dc2626; }
        .medication-details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .actions { background: #fef3c7; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .urgent { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 EMERGENCY MEDICATION ALERT</h1>
        </div>
        <div class="content">
            <p class="urgent">Critical medication missed by ${missedDose.patient_email}</p>
            
            <div class="medication-details">
                <h3>Medication Details:</h3>
                <ul>
                    <li><strong>Medication:</strong> ${missedDose.medication_name}</li>
                    <li><strong>Dosage:</strong> ${missedDose.dosage}</li>
                    <li><strong>Scheduled Time:</strong> ${this.formatTime(missedDose.time)}</li>
                    <li><strong>Consecutive Missed:</strong> ${missedDose.consecutive_missed} doses</li>
                </ul>
            </div>
            
            <div class="actions">
                <h3>Immediate Actions Required:</h3>
                <ol>
                    <li>Contact ${missedDose.patient_email} immediately</li>
                    <li>Ensure they take the medication if safe</li>
                    <li>Check their overall well-being</li>
                    <li>Consider contacting healthcare provider</li>
                </ol>
            </div>
            
            <p><strong>If this is a medical emergency, call 911 immediately.</strong></p>
        </div>
        <div class="footer">
            <p>PillPulse Emergency Alert System<br>
            Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Log emergency alert to database
   */
  async logEmergencyAlert(missedDose) {
    try {
      const { execute } = await import('../models/database.js');
      
      await execute(`
        INSERT INTO notifications 
        (user_id, schedule_id, type, title, message, ai_generated)
        VALUES (?, ?, 'missed_dose', ?, ?, 0)
      `, [
        missedDose.user_id,
        missedDose.schedule_id,
        `🚨 Emergency Alert: ${missedDose.medication_name} missed`,
        `Critical medication ${missedDose.medication_name} (${missedDose.dosage}) has been missed. ${missedDose.consecutive_missed} consecutive doses missed. Emergency contacts have been notified.`
      ]);
      
    } catch (error) {
      console.error('❌ Failed to log emergency alert:', error);
    }
  }

  /**
   * Format time to 12-hour format
   */
  formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('📊 Emergency alert thresholds updated:', this.alertThresholds);
  }

  /**
   * Get emergency alert statistics
   */
  async getAlertStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(DISTINCT user_id) as affected_users,
        COUNT(DISTINCT schedule_id) as affected_medications
      FROM notifications
      WHERE type = 'missed_dose'
        AND sent_at >= ?
    `, [startDate.toISOString()]);

    return stats[0] || { total_alerts: 0, affected_users: 0, affected_medications: 0 };
  }
}

// Create singleton instance
const emergencyAlertService = new EmergencyAlertService();

export default emergencyAlertService;