import { useState, useRef, useCallback } from 'react'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface VoiceCaptureState {
  isRecording: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
}

export function useVoiceCapture() {
  const [state, setState] = useState<VoiceCaptureState>({
    isRecording: false,
    isSupported:
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    transcript: '',
    interimTranscript: '',
    error: null,
  })

  const recognitionRef = useRef<any>(null)

  const startRecording = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setState((prev) => ({ ...prev, error: 'Speech recognition not supported' }))
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        } else {
          interimTranscript = event.results[i][0].transcript
        }
      }

      setState((prev) => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
      }))
    }

    recognition.onerror = (event: any) => {
      setState((prev) => ({ ...prev, error: event.error, isRecording: false }))
    }

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isRecording: false, interimTranscript: '' }))
    }

    recognition.start()
    recognitionRef.current = recognition
    setState((prev) => ({ ...prev, isRecording: true, error: null }))
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setState((prev) => ({ ...prev, isRecording: false, interimTranscript: '' }))
  }, [])

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
    }))
  }, [])

  return { ...state, startRecording, stopRecording, reset }
}
