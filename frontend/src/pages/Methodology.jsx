import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getMethodology } from '../lib/api'

export default function Methodology() {
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    getMethodology()
      .then((data) => {
        setContent(data.content)
        setStatus('loaded')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto prose prose-invert">
      {status === 'loading' && (
        <div className="h-96 rounded-lg border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-gray-400 italic">
          Couldn't load the methodology page right now. Please try refreshing.
        </p>
      )}

      {status === 'loaded' && content && <ReactMarkdown>{content}</ReactMarkdown>}
    </main>
  )
}
