import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query, queryOne, execute } from '../models/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'

/**
 * Caregiver Routes for PillPulse API
 * Handles caregiver invitations, relationships, and access management
 * Supports patient-caregiver connections with different access levels
 */

const router = express.Router()

/**
 * @route GET /api/caregiver/relationships
 * @desc Get user's caregiver relationships (both as patient and caregiver)
 * @access Private
 */
router.get('/relationships', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    // Get relationships where user is the patient
    const asPatient = await query(`
      SELECT 
        cr.id,
        cr.status,
        cr.access_level,
        cr.invited_at,
        cr.accepted_at,
        cr.notes,
        u.id as caregiver_id,
        u.email as caregiver_email,
        'patient' as role
      FROM caregiver_relationships cr
      JOIN users u ON cr.caregiver_id = u.id
      WHERE cr.patient_id = ?
      ORDER BY cr.invited_at DESC
    `, [userId])

    // Get relationships where user is the caregiver
    const asCaregiver = await query(`
      SELECT 
        cr.id,
        cr.status,
        cr.access_level,
        cr.invited_at,
        cr.accepted_at,
        cr.notes,
        u.id as patient_id,
        u.email as patient_email,
        'caregiver' as role
      FROM caregiver_relationships cr
      JOIN users u ON cr.patient_id = u.id
      WHERE cr.caregiver_id = ?
      ORDER BY cr.invited_at DESC
    `, [userId])

    res.json({
      success: true,
      data: {
        asPatient,
        asCaregiver,
        total: asPatient.length + asCaregiver.length
      }
    })
  } catch (error) {
    console.error('Error fetching caregiver relationships:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch caregiver relationships'
    })
  }
})

/**
 * @route POST /api/caregiver/invite
 * @desc Invite a caregiver to access patient's data
 * @access Private
 */
router.post('/invite', authenticateToken, validateRequest([
  'caregiver_email',
  'access_level'
]), async (req, res) => {
  try {
    const { caregiver_email, access_level, notes } = req.body
    const patientId = req.user.id

    // Validate access level
    const validAccessLevels = ['view', 'edit', 'full']
    if (!validAccessLevels.includes(access_level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access level. Must be view, edit, or full'
      })
    }

    // Check if caregiver email exists as a user
    const caregiverUser = await queryOne(
      'SELECT id, email FROM users WHERE email = ?',
      [caregiver_email]
    )

    if (!caregiverUser) {
      return res.status(400).json({
        success: false,
        error: 'Caregiver email not found. They must create an account first'
      })
    }

    // Check if relationship already exists
    const existingRelationship = await queryOne(`
      SELECT id, status FROM caregiver_relationships
      WHERE patient_id = ? AND caregiver_id = ?
    `, [patientId, caregiverUser.id])

    if (existingRelationship) {
      return res.status(400).json({
        success: false,
        error: `Caregiver relationship already exists with status: ${existingRelationship.status}`
      })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation record
    await execute(`
      INSERT INTO caregiver_invitations 
      (patient_id, caregiver_email, invitation_token, access_level, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [patientId, caregiver_email, invitationToken, access_level, expiresAt.toISOString(), notes])

    // Create pending relationship
    await execute(`
      INSERT INTO caregiver_relationships 
      (patient_id, caregiver_id, status, access_level, created_by, notes)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `, [patientId, caregiverUser.id, access_level, patientId, notes])

    res.json({
      success: true,
      data: {
        invitation_token: invitationToken,
        caregiver_email,
        access_level,
        expires_at: expiresAt.toISOString(),
        message: 'Caregiver invitation sent successfully'
      }
    })
  } catch (error) {
    console.error('Error inviting caregiver:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to invite caregiver'
    })
  }
})

/**
 * @route POST /api/caregiver/accept-invitation
 * @desc Accept a caregiver invitation
 * @access Private
 */
router.post('/accept-invitation', authenticateToken, validateRequest([
  'invitation_token'
]), async (req, res) => {
  try {
    const { invitation_token } = req.body
    const caregiverId = req.user.id

    // Find valid invitation
    const invitation = await queryOne(`
      SELECT ci.*, u.email as patient_email
      FROM caregiver_invitations ci
      JOIN users u ON ci.patient_id = u.id
      WHERE ci.invitation_token = ? 
      AND ci.used_at IS NULL 
      AND ci.expires_at > datetime('now')
    `, [invitation_token])

    if (!invitation) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invitation token'
      })
    }

    // Verify the caregiver email matches the current user
    if (invitation.caregiver_email !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: 'This invitation is not for your email address'
      })
    }

    const now = new Date().toISOString()

    // Update relationship status to accepted
    await execute(`
      UPDATE caregiver_relationships 
      SET status = 'accepted', accepted_at = ?
      WHERE patient_id = ? AND caregiver_id = ?
    `, [now, invitation.patient_id, caregiverId])

    // Mark invitation as used
    await execute(`
      UPDATE caregiver_invitations 
      SET used_at = ?
      WHERE id = ?
    `, [now, invitation.id])

    res.json({
      success: true,
      data: {
        patient_email: invitation.patient_email,
        access_level: invitation.access_level,
        accepted_at: now,
        message: 'Caregiver invitation accepted successfully'
      }
    })
  } catch (error) {
    console.error('Error accepting caregiver invitation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to accept caregiver invitation'
    })
  }
})

/**
 * @route POST /api/caregiver/decline-invitation
 * @desc Decline a caregiver invitation
 * @access Private
 */
router.post('/decline-invitation', authenticateToken, validateRequest([
  'invitation_token'
]), async (req, res) => {
  try {
    const { invitation_token } = req.body
    const caregiverId = req.user.id

    // Find valid invitation
    const invitation = await queryOne(`
      SELECT ci.*, u.email as patient_email
      FROM caregiver_invitations ci
      JOIN users u ON ci.patient_id = u.id
      WHERE ci.invitation_token = ? 
      AND ci.used_at IS NULL 
      AND ci.expires_at > datetime('now')
    `, [invitation_token])

    if (!invitation) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invitation token'
      })
    }

    // Verify the caregiver email matches the current user
    if (invitation.caregiver_email !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: 'This invitation is not for your email address'
      })
    }

    const now = new Date().toISOString()

    // Update relationship status to declined
    await execute(`
      UPDATE caregiver_relationships 
      SET status = 'declined'
      WHERE patient_id = ? AND caregiver_id = ?
    `, [invitation.patient_id, caregiverId])

    // Mark invitation as used
    await execute(`
      UPDATE caregiver_invitations 
      SET used_at = ?
      WHERE id = ?
    `, [now, invitation.id])

    res.json({
      success: true,
      data: {
        patient_email: invitation.patient_email,
        message: 'Caregiver invitation declined'
      }
    })
  } catch (error) {
    console.error('Error declining caregiver invitation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to decline caregiver invitation'
    })
  }
})

/**
 * @route DELETE /api/caregiver/relationships/:id
 * @desc Remove a caregiver relationship
 * @access Private
 */
router.delete('/relationships/:id', authenticateToken, async (req, res) => {
  try {
    const relationshipId = req.params.id
    const userId = req.user.id

    // Find the relationship and verify user has permission to delete it
    const relationship = await queryOne(`
      SELECT * FROM caregiver_relationships
      WHERE id = ? AND (patient_id = ? OR caregiver_id = ?)
    `, [relationshipId, userId, userId])

    if (!relationship) {
      return res.status(404).json({
        success: false,
        error: 'Caregiver relationship not found or unauthorized'
      })
    }

    // Update status to revoked instead of deleting (for audit trail)
    await execute(`
      UPDATE caregiver_relationships 
      SET status = 'revoked'
      WHERE id = ?
    `, [relationshipId])

    res.json({
      success: true,
      data: {
        message: 'Caregiver relationship removed successfully'
      }
    })
  } catch (error) {
    console.error('Error removing caregiver relationship:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove caregiver relationship'
    })
  }
})

/**
 * @route GET /api/caregiver/patients/:patientId/schedules
 * @desc Get schedules for a patient (caregiver access)
 * @access Private (Caregiver only)
 */
router.get('/patients/:patientId/schedules', authenticateToken, async (req, res) => {
  try {
    const patientId = req.params.patientId
    const caregiverId = req.user.id

    // Verify caregiver has access to this patient
    const relationship = await queryOne(`
      SELECT access_level FROM caregiver_relationships
      WHERE patient_id = ? AND caregiver_id = ? AND status = 'accepted'
    `, [patientId, caregiverId])

    if (!relationship) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to patient data'
      })
    }

    // Get patient schedules
    const schedules = await query(`
      SELECT s.*, u.email as patient_email
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.time ASC
    `, [patientId])

    res.json({
      success: true,
      data: {
        schedules,
        access_level: relationship.access_level,
        patient_id: patientId
      }
    })
  } catch (error) {
    console.error('Error fetching patient schedules:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient schedules'
    })
  }
})

/**
 * @route GET /api/caregiver/patients/:patientId/adherence
 * @desc Get adherence data for a patient (caregiver access)
 * @access Private (Caregiver only)
 */
router.get('/patients/:patientId/adherence', authenticateToken, async (req, res) => {
  try {
    const patientId = req.params.patientId
    const caregiverId = req.user.id
    const { start_date, end_date } = req.query

    // Verify caregiver has access to this patient
    const relationship = await queryOne(`
      SELECT access_level FROM caregiver_relationships
      WHERE patient_id = ? AND caregiver_id = ? AND status = 'accepted'
    `, [patientId, caregiverId])

    if (!relationship) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to patient data'
      })
    }

    // Build query with optional date filters
    let adherenceQuery = `
      SELECT ar.*, s.medication_name, s.dosage, s.time, u.email as patient_email
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `
    const queryParams = [patientId]

    if (start_date) {
      adherenceQuery += ' AND ar.date >= ?'
      queryParams.push(start_date)
    }

    if (end_date) {
      adherenceQuery += ' AND ar.date <= ?'
      queryParams.push(end_date)
    }

    adherenceQuery += ' ORDER BY ar.date DESC, s.time ASC'

    const adherenceRecords = await query(adherenceQuery, queryParams)

    res.json({
      success: true,
      data: {
        adherence_records: adherenceRecords,
        access_level: relationship.access_level,
        patient_id: patientId,
        date_range: { start_date, end_date }
      }
    })
  } catch (error) {
    console.error('Error fetching patient adherence:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient adherence data'
    })
  }
})

/**
 * @route GET /api/caregiver/emergency-contacts
 * @desc Get user's emergency contacts
 * @access Private
 */
router.get('/emergency-contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    const contacts = await query(`
      SELECT * FROM emergency_contacts
      WHERE user_id = ?
      ORDER BY priority ASC, created_at ASC
    `, [userId])

    res.json({
      success: true,
      data: { contacts }
    })
  } catch (error) {
    console.error('Error fetching emergency contacts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency contacts'
    })
  }
})

/**
 * @route POST /api/caregiver/emergency-contacts
 * @desc Add an emergency contact
 * @access Private
 */
router.post('/emergency-contacts', authenticateToken, validateRequest([
  'name',
  'relationship'
]), async (req, res) => {
  try {
    const {
      name,
      relationship,
      phone,
      email,
      priority = 1,
      notify_missed_doses = true,
      notify_emergencies = true
    } = req.body
    const userId = req.user.id

    // Validate that at least phone or email is provided
    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either phone or email must be provided'
      })
    }

    const result = await execute(`
      INSERT INTO emergency_contacts 
      (user_id, name, relationship, phone, email, priority, notify_missed_doses, notify_emergencies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, name, relationship, phone, email, priority, notify_missed_doses, notify_emergencies])

    // Get the created contact
    const newContact = await queryOne(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [result.lastID]
    )

    res.json({
      success: true,
      data: { contact: newContact }
    })
  } catch (error) {
    console.error('Error adding emergency contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add emergency contact'
    })
  }
})

/**
 * @route PUT /api/caregiver/emergency-contacts/:id
 * @desc Update an emergency contact
 * @access Private
 */
router.put('/emergency-contacts/:id', authenticateToken, async (req, res) => {
  try {
    const contactId = req.params.id
    const userId = req.user.id
    const {
      name,
      relationship,
      phone,
      email,
      priority,
      notify_missed_doses,
      notify_emergencies
    } = req.body

    // Verify contact belongs to user
    const existingContact = await queryOne(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    )

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found'
      })
    }

    // Update contact
    await execute(`
      UPDATE emergency_contacts 
      SET name = ?, relationship = ?, phone = ?, email = ?, 
          priority = ?, notify_missed_doses = ?, notify_emergencies = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, relationship, phone, email, priority, notify_missed_doses, notify_emergencies, contactId, userId])

    // Get updated contact
    const updatedContact = await queryOne(
      'SELECT * FROM emergency_contacts WHERE id = ?',
      [contactId]
    )

    res.json({
      success: true,
      data: { contact: updatedContact }
    })
  } catch (error) {
    console.error('Error updating emergency contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update emergency contact'
    })
  }
})

/**
 * @route DELETE /api/caregiver/emergency-contacts/:id
 * @desc Delete an emergency contact
 * @access Private
 */
router.delete('/emergency-contacts/:id', authenticateToken, async (req, res) => {
  try {
    const contactId = req.params.id
    const userId = req.user.id

    // Verify contact belongs to user and delete
    const result = await execute(
      'DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    )

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found'
      })
    }

    res.json({
      success: true,
      data: { message: 'Emergency contact deleted successfully' }
    })
  } catch (error) {
    console.error('Error deleting emergency contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete emergency contact'
    })
  }
})

export default router