import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..', '..')

const backend = spawn('python', ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: workspaceRoot,
  stdio: 'inherit',
  shell: true,
})

const frontend = spawn('npm', ['run', 'dev:frontend'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
})

backend.on('exit', (code) => {
  if (code !== 0) {
    frontend.kill()
    process.exit(code ?? 1)
  }
})

frontend.on('exit', (code) => {
  backend.kill()
  process.exit(code ?? 0)
})

process.on('SIGINT', () => {
  backend.kill('SIGINT')
  frontend.kill('SIGINT')
  process.exit(0)
})
