/**
 * TrustLens AI Cyber Safety Assistant Chat Service — Day 6
 *
 * Manages conversational cyber safety guidance, incident emergency triage,
 * file uploads, and session persistence via Flask backend and Supabase.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

/**
 * Sends a message to the TrustLens Cyber Safety Assistant.
 */
export async function sendChatMessage(message, options = {}) {
  const {
    conversationId,
    model = 'auto',
    language = 'en',
    attachmentContext,
    authToken,
    userId
  } = options

  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      model,
      language,
      attachment_context: attachmentContext
    })
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Chat assistant request failed.')
  }
  return json.data
}

/**
 * Uploads an image or file attachment to accompany a chat query.
 */
export async function uploadChatAttachment(file, options = {}) {
  const { authToken, userId } = options
  const formData = new FormData()
  formData.append('file', file)

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/chat/upload`, {
    method: 'POST',
    headers,
    body: formData
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Attachment upload failed.')
  }
  return json.data
}

/**
 * Lists all conversations for the authenticated user.
 */
export async function listConversations(options = {}) {
  const { authToken, userId } = options
  if (!userId) return []

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
      method: 'GET',
      headers
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data?.conversations || []
  } catch (err) {
    return []
  }
}

/**
 * Retrieves message history for a specific conversation.
 */
export async function getConversationMessages(conversationId, options = {}) {
  const { authToken, userId } = options
  if (!conversationId) return []

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}`, {
      method: 'GET',
      headers
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data?.messages || []
  } catch (err) {
    return []
  }
}

/**
 * Deletes a conversation and its messages.
 */
export async function deleteConversation(conversationId, options = {}) {
  const { authToken, userId } = options
  if (!conversationId) return false

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) return false
    const json = await res.json()
    return json.data?.deleted || false
  } catch (err) {
    return false
  }
}

