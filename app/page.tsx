"use client"

import { useState, useRef } from "react"

type Status = "idle" | "extracting" | "done" | "error"
const APP_VERSION = "V1.1"

export default function Home() {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [resultUrl, setResultUrl] = useState("")
  const [filename, setFilename] = useState("")
  const [costUsd, setCostUsd] = useState<number | null>(null)
  const [passcode, setPasscode] = useState("")
  const [fullFile, setFullFile] = useState<File | null>(null)
  const [basicFile, setBasicFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState<"full" | "basic" | null>(null)
  const fullInputRef = useRef<HTMLInputElement>(null)
  const basicInputRef = useRef<HTMLInputElement>(null)

  function selectFile(file: File, role: "full" | "basic") {
    if (file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.")
      setStatus("error")
      return
    }

    if (role === "full") setFullFile(file)
    else setBasicFile(file)
    setErrorMsg("")
    setStatus("idle")
  }

  async function handleSubmit() {
    if (!fullFile) {
      setErrorMsg("Please select the required Full Breakdown PDF.")
      setStatus("error")
      return
    }

    setStatus("extracting")
    setErrorMsg("")
    setResultUrl("")
    setCostUsd(null)

    const formData = new FormData()
    formData.append("passcode", passcode)
    formData.append("full_pdf", fullFile)
    if (basicFile) formData.append("basic_pdf", basicFile)

    try {
      const res = await fetch("/api/process", { method: "POST", body: formData })

      if (!res.ok) {
        const json = await res.json() as { error?: string; reasons?: string[]; costUsd?: number | null }
        if (typeof json.costUsd === "number") setCostUsd(json.costUsd)
        const reasons = json.reasons?.length ? ` ${json.reasons.join(" ")}` : ""
        throw new Error(`${json.error ?? "Processing failed"}${reasons}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const costHeader = res.headers.get("X-OpenAI-Cost-USD")
      const match = disposition.match(/filename="(.+)"/)
      setFilename(match ? match[1] : "benefits_form.jpg")
      setResultUrl(url)
      setCostUsd(costHeader ? Number(costHeader) : null)
      setStatus("done")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
      setStatus("error")
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>, role: "full" | "basic") {
    const file = e.target.files?.[0]
    if (file) selectFile(file, role)
  }

  function onDrop(e: React.DragEvent, role: "full" | "basic") {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files?.[0]
    if (file) selectFile(file, role)
  }

  const busy = status === "extracting"

  return (
    <main className="relative min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="absolute right-4 top-4 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500 shadow-sm">
        {APP_VERSION}
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Benefits Form Processor</h1>
          <p className="mt-1 text-sm text-gray-500">Upload a Stratus benefits breakdown PDF to generate a completed form.</p>
        </div>

        <div className="space-y-4">
          {(["full", "basic"] as const).map((role) => {
            const selectedFile = role === "full" ? fullFile : basicFile
            const inputRef = role === "full" ? fullInputRef : basicInputRef
            const label = role === "full" ? "Full Breakdown" : "Basic Breakdown"
            const requirement = role === "full" ? "Required" : "Optional"

            return (
              <div key={role}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-800">{label}</label>
                  <span className="text-xs text-gray-400">{requirement}</span>
                </div>
                <div
                  onClick={() => !busy && inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(role) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(e, role)}
                  className={[
                    "border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors",
                    dragOver === role ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400",
                    busy ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => onInputChange(e, role)}
                    disabled={busy}
                  />
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : "Drop PDF here or click to browse"}
                  </p>
                </div>
              </div>
            )
          })}

          <div>
            <label htmlFor="passcode" className="mb-2 block text-sm font-semibold text-gray-800">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="current-password"
              disabled={busy}
              placeholder="Enter passcode"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !fullFile || !passcode}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <span className="flex items-center gap-3">
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Extracting fields and rendering form…
              </span>
            ) : "Process Benefits"}
          </button>
        </div>

        {status === "error" && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <p>{errorMsg}</p>
            {costUsd !== null && <p className="mt-2 font-medium">Estimated OpenAI cost: ${costUsd.toFixed(4)}</p>}
          </div>
        )}

        {status === "done" && resultUrl && (
          <div className="mt-6 space-y-3">
            <img src={resultUrl} alt="Completed benefits form" className="w-full rounded-lg border border-gray-200 shadow-sm" />
            {costUsd !== null && (
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-700">
                Estimated OpenAI cost for this run: <span className="font-semibold">${costUsd.toFixed(4)}</span>
              </div>
            )}
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
                setCostUsd(null)
                setFullFile(null)
                setBasicFile(null)
                if (fullInputRef.current) fullInputRef.current.value = ""
                if (basicInputRef.current) basicInputRef.current.value = ""
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
