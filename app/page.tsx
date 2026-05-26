"use client"

import { useState, useRef } from "react"

type Status = "idle" | "extracting" | "done" | "error"

export default function Home() {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [resultUrl, setResultUrl] = useState("")
  const [filename, setFilename] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.")
      setStatus("error")
      return
    }

    setStatus("extracting")
    setErrorMsg("")
    setResultUrl("")

    const formData = new FormData()
    formData.append("pdf", file)

    try {
      const res = await fetch("/api/process", { method: "POST", body: formData })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? "Processing failed")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="(.+)"/)
      setFilename(match ? match[1] : "benefits_form.jpg")
      setResultUrl(url)
      setStatus("done")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
      setStatus("error")
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const busy = status === "extracting"

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Benefits Form Processor</h1>
          <p className="mt-1 text-sm text-gray-500">Upload a Stratus benefits breakdown PDF to generate a completed form.</p>
        </div>

        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400",
            busy ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onInputChange}
            disabled={busy}
          />

          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-600">Extracting fields and rendering form…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-700">Drop PDF here or click to browse</p>
              <p className="text-xs text-gray-400">Stratus full breakdown PDF</p>
            </div>
          )}
        </div>

        {status === "error" && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {status === "done" && resultUrl && (
          <div className="mt-6 space-y-3">
            <img src={resultUrl} alt="Completed benefits form" className="w-full rounded-lg border border-gray-200 shadow-sm" />
            <a
              href={resultUrl}
              download={filename}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download {filename}
            </a>
            <button
              onClick={() => {
                setStatus("idle")
                setResultUrl("")
                if (inputRef.current) inputRef.current.value = ""
              }}
              className="w-full rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm py-2 px-4 transition-colors"
            >
              Process another
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
