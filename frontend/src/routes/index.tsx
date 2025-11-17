import { ScriptStudioPage } from '@/components/ScriptStudioPage'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/')({
  component: ScriptStudioPage,
})
