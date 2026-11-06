/**
 * Multimodal Analysis Service — Day 6 Advanced Multimodal AI & Regional Intelligence
 *
 * Connects to the Flask AI Backend for Text, Image (OCR & QR), Audio (Whisper),
 * and Video inspection with Multi-Model Consensus and Regional Language support.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

/**
 * Checks connectivity and readiness of multimodal subsystems.
 */
export async function getMultimodalHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/multimodal/health`, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data
  } catch (err) {
    return {
      status: 'offline',
      capabilities: {
        text_analysis: true,
        image_ocr_and_qr: false,
        audio_transcription: false,
        video_analysis: false,
        regional_languages: ['en', 'kn', 'hi']
      }
    }
  }
}

/**
 * Analyzes plain text messages (SMS, WhatsApp, Email, Banking, UPI).
 */
export async function analyzeMultimodalText(text, options = {}) {
  const { targetLanguage = 'en', authToken, userId } = options
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/analyze/multimodal`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text,
      target_language: targetLanguage
    })
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Multimodal text analysis failed.')
  }
  return json.data
}

/**
 * Analyzes uploaded images (JPG, PNG, WEBP), performs OCR, and extracts QR codes.
 */
export async function analyzeImageFile(file, options = {}) {
  const { targetLanguage = 'en', authToken, userId } = options
  const formData = new FormData()
  formData.append('file', file)
  formData.append('target_language', targetLanguage)

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/analyze/image`, {
    method: 'POST',
    headers,
    body: formData
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Image analysis failed.')
  }
  return json.data
}

/**
 * Transcribes audio (MP3, WAV, M4A) and assesses voice fraud indicators.
 */
export async function analyzeAudioFile(file, options = {}) {
  const { targetLanguage = 'en', authToken, userId } = options
  const formData = new FormData()
  formData.append('file', file)
  formData.append('target_language', targetLanguage)

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/analyze/audio`, {
    method: 'POST',
    headers,
    body: formData
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Audio voice analysis failed.')
  }
  return json.data
}

/**
 * Inspects video container (MP4), extracts sample frames, transcribes audio,
 * and runs threat consensus with explicit forensic deepfake disclaimer.
 */
export async function analyzeVideoFile(file, options = {}) {
  const { targetLanguage = 'en', authToken, userId } = options
  const formData = new FormData()
  formData.append('file', file)
  formData.append('target_language', targetLanguage)

  const headers = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${API_BASE_URL}/api/analyze/video`, {
    method: 'POST',
    headers,
    body: formData
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message || 'Video analysis failed.')
  }
  return json.data
}
