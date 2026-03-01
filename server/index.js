import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import multer from 'multer'

const PORT = process.env.PORT || 4173
const ROOT = process.cwd()
const DIST_DIR = path.join(ROOT, 'dist')
const STORAGE_ROOT = path.join(ROOT, 'server-data')
const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads')
const OUTPUT_DIR = path.join(STORAGE_ROOT, 'output')
const THUMBS_DIR = path.join(STORAGE_ROOT, 'thumbnails')

for (const dir of [STORAGE_ROOT, UPLOADS_DIR, OUTPUT_DIR, THUMBS_DIR]) {
  fs.mkdirSync(dir, { recursive: true })
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/media', express.static(STORAGE_ROOT))

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname)
    const id = cryptoRandomId()
    cb(null, `${id}${ext}`)
  },
})
const upload = multer({ storage })

const streams = new Map()
const hasNvenc = detectNvenc()

function cryptoRandomId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10)).replace(/-/g, '')
}

function detectNvenc() {
  try {
    const res = spawnSync('ffmpeg', ['-hide_banner', '-hwaccels'])
    const output = res.stdout.toString().toLowerCase()
    return output.includes('cuda') || output.includes('nvenc') || output.includes('nvidia')
  } catch (err) {
    console.warn('[server] Could not detect NVENC availability', err?.message)
    return false
  }
}

function formatHms(totalSeconds = 0) {
  const secs = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const seconds = secs % 60
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function sendEvent(batchId, eventName, payload) {
  const listeners = streams.get(batchId)
  if (!listeners) return
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
  for (const res of listeners) {
    res.write(data)
  }
}

async function probeVideo(filePath) {
  return await new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,r_frame_rate,duration',
      '-of',
      'json',
      filePath,
    ]

    const ffprobe = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    ffprobe.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    ffprobe.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffprobe.on('close', () => {
      if (stderr) {
        console.warn('[ffprobe] stderr:', stderr)
      }
      try {
        const parsed = JSON.parse(stdout)
        const stream = parsed?.streams?.[0]
        const dims = stream?.width && stream?.height ? [stream.width, stream.height] : null
        const duration = stream?.duration ? Number.parseFloat(stream.duration) : null
        const fpsRaw = stream?.r_frame_rate
        let fps = null
        if (fpsRaw && fpsRaw.includes('/')) {
          const [a, b] = fpsRaw.split('/')
          const num = Number(a)
          const den = Number(b)
          fps = den !== 0 ? num / den : null
        }
        resolve({ duration, dimensions: dims, fps })
      } catch (err) {
        resolve({ duration: null, dimensions: null, fps: null })
      }
    })
  })
}

async function createThumbnail(inputPath, fileName) {
  const thumbPath = path.join(THUMBS_DIR, `${fileName}.jpg`)
  return await new Promise((resolve) => {
    const args = [
      '-y',
      '-ss',
      '00:00:01',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      thumbPath,
    ]
    const ffmpeg = spawn('ffmpeg', args, { stdio: 'ignore' })
    ffmpeg.on('exit', (code) => {
      resolve(code === 0 ? thumbPath : null)
    })
  })
}

async function compressVideo({
  inputPath,
  outputPath,
  convertToExtension,
  quality,
  batchId,
  videoId,
  duration,
}) {
  const args = ['-y', '-i', inputPath]

  const useNvenc = hasNvenc && convertToExtension !== 'webm'
  const videoCodec = useNvenc ? 'h264_nvenc' : 'libx264'
  args.push('-c:v', videoCodec)

  const clampQuality = (value) => Math.min(100, Math.max(0, value ?? 50))
  const qualityValue = clampQuality(quality)

  if (useNvenc) {
    const maxCq = 28
    const minCq = 16
    const cq = minCq + Math.round(((maxCq - minCq) * (100 - qualityValue)) / 100)
    args.push('-rc:v', 'vbr', '-cq', `${cq}`, '-preset', 'fast')
  } else {
    const maxCrf = 36
    const minCrf = 20
    const crf = minCrf + Math.round(((maxCrf - minCrf) * (100 - qualityValue)) / 100)
    args.push('-crf', `${crf}`, '-preset', 'slow')
  }

  args.push('-c:a', 'copy')
  args.push('-progress', 'pipe:1', '-nostats', '-loglevel', 'error', outputPath)

  return await new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        const match = line.match(/out_time_ms=(\d+)/)
        if (match) {
          const currentMs = Number(match[1])
          const currentSeconds = currentMs / 1_000_000
          const etaSeconds = duration ? Math.max(duration - currentSeconds, 0) : null
          sendEvent(batchId, 'VideoCompressionProgress', {
            batchId,
            videoId,
            fileName: path.basename(inputPath),
            currentDuration: formatHms(currentSeconds),
            eta: etaSeconds != null ? formatHms(etaSeconds) : null,
          })
        }
      }
    })

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve({ outputPath })
      } else {
        reject(new Error(stderr || 'Compression failed'))
      }
    })
  })
}

function fileMetadata(filePath) {
  const stat = fs.statSync(filePath)
  const ext = path.extname(filePath).replace('.', '')
  return {
    fileName: path.basename(filePath),
    path: filePath,
    mimeType: ext,
    extension: ext,
    size: stat.size,
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, hasNvenc })
})

app.get('/api/events/:batchId', (req, res) => {
  const { batchId } = req.params
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')

  const listeners = streams.get(batchId) || []
  listeners.push(res)
  streams.set(batchId, listeners)

  req.on('close', () => {
    const arr = streams.get(batchId) || []
    const next = arr.filter((r) => r !== res)
    if (next.length) {
      streams.set(batchId, next)
    } else {
      streams.delete(batchId)
    }
  })
})

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : []
    const results = []

    for (const file of files) {
      const meta = await probeVideo(file.path)
      const thumb = await createThumbnail(file.path, path.parse(file.filename).name)
      results.push({
        id: path.parse(file.filename).name,
        originalName: file.originalname,
        storedPath: file.path,
        publicUrl: `/media/uploads/${file.filename}`,
        thumbnailUrl: thumb ? `/media/thumbnails/${path.basename(thumb)}` : null,
        size: file.size,
        duration: meta.duration,
        fps: meta.fps,
        dimensions: meta.dimensions,
      })
    }

    res.json({ files: results })
  } catch (err) {
    console.error('[upload]', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.post('/api/compress', async (req, res) => {
  const { batchId, videos } = req.body || {}
  if (!batchId || !Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const results = {}

  try {
    for (const video of videos) {
      const inputPath = video.inputPath
      const convertToExtension = video.convertToExtension || 'mp4'
      if (!inputPath || !fs.existsSync(inputPath)) {
        continue
      }
      const outputPath = path.join(OUTPUT_DIR, `${video.videoId || cryptoRandomId()}.${convertToExtension}`)
      const meta = await probeVideo(inputPath)

      await compressVideo({
        inputPath,
        outputPath,
        convertToExtension,
        quality: video.quality ?? 50,
        batchId,
        videoId: video.videoId,
        duration: meta.duration ?? 0,
      })

      const outMeta = fileMetadata(outputPath)
      const payload = {
        batchId,
        result: {
          videoId: video.videoId,
          fileName: outMeta.fileName,
          filePath: outputPath,
          fileMetadata: outMeta,
        },
      }
      sendEvent(batchId, 'BatchCompressionIndividualCompressionCompletion', payload)
      results[video.videoId] = {
        videoId: video.videoId,
        fileName: outMeta.fileName,
        filePath: `/media/output/${outMeta.fileName}`,
        fileMetadata: outMeta,
      }
    }
    res.json({ results })
  } catch (err) {
    console.error('[compress]', err)
    res.status(500).json({ error: err?.message || 'Compression failed' })
  }
})

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (_, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`compressO server listening on http://localhost:${PORT}`)
  if (!hasNvenc) {
    console.warn('NVIDIA NVENC not detected. Falling back to CPU / software encoding.')
  }
})
